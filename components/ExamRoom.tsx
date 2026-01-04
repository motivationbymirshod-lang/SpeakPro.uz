
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { pcmToGeminiBlob, base64ToUint8Array, decodeAudioData } from '../utils/audioUtils';
import { UserProfile } from '../types';

interface ExamRoomProps {
  user: UserProfile;
  onFinish: (transcript: string) => void | Promise<void>;
}

// Internal phases for logic control
type ExamPhase = 'WAITING_FOR_TRIGGER' | 'PART1' | 'PART2_PREP' | 'PART2_SPEAKING' | 'PART3';

const ExamRoom: React.FC<ExamRoomProps> = ({ user, onFinish }) => {
  // UI States
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState("Connecting..."); // Used for the Top-Left Label
  const [error, setError] = useState<string | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  
  // Logic Refs
  const currentPhaseRef = useRef<ExamPhase>('WAITING_FOR_TRIGGER');
  const turnStartTimeRef = useRef<number>(0); 
  const prepStartTimeRef = useRef<number>(0); 
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const timerIntervalRef = useRef<any>(null);

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptRef = useRef<string>(""); 
  
  const isFinishedRef = useRef(false);
  const isSocketOpenRef = useRef(false);
  const isAiSpeakingRef = useRef(false);
  const initializedRef = useRef(false);

  // --- VIDEO AVATAR REF ---
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // MUHIM: O'zingizning videongizni loyihaning "public" papkasiga joylashtiring.
  // Fayl nomi aniq "examiner.mp4" bo'lishi kerak.
  const VIDEO_SRC = "/examiner.mp4"; 
  // Agar poster rasm qo'ymagan bo'lsangiz, qora fon turadi yoki videoning 1-kadri yuklanadi.
  const POSTER_IMG = "/examiner_poster.jpg"; 

  // Fallback video (agar siz hali o'z videongizni qo'ymagan bo'lsangiz ishlaydi)
  const FALLBACK_VIDEO = "https://videos.pexels.com/video-files/6975239/6975239-sd_640_360_25fps.mp4";

  // --- CLEANUP ---
  const cleanupAudioNodes = useCallback(() => {
      try {
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current.onaudioprocess = null;
            processorRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
             inputAudioContextRef.current.close().catch(() => {});
        }
        inputAudioContextRef.current = null;
        
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
             audioContextRef.current.close().catch(() => {});
        }
        audioContextRef.current = null;
      } catch (e) { console.error("Cleanup error", e); }
  }, []);

  const stopExam = useCallback(() => {
     isFinishedRef.current = true;
     isSocketOpenRef.current = false;
     if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
     sourcesRef.current.forEach(source => { try { source.stop(); } catch (e) {} });
     sourcesRef.current.clear();
     cleanupAudioNodes();
     setIsConnected(false);
  }, [cleanupAudioNodes]);

  useEffect(() => { return () => stopExam(); }, [stopExam]);

  // --- AVATAR CONTROL (Lip Sync Logic) ---
  useEffect(() => {
      let animationFrameId: number;

      const updateVideoState = () => {
          const vid = videoRef.current;
          if (vid && vid.readyState >= 2) { // 2 = HAVE_CURRENT_DATA
              if (isAiSpeakingRef.current) {
                  // AI Speaking -> Play Video
                  if (vid.paused) {
                      vid.play().catch(e => {
                          // Ignored: harmless play interruption
                      });
                  }
              } else {
                  // AI Silent -> Pause Video
                  if (!vid.paused) {
                      vid.pause();
                      // Optional: Reset to specific frame if you want consistent "closed mouth" look
                      // vid.currentTime = 0; 
                  }
              }
          }
          animationFrameId = requestAnimationFrame(updateVideoState);
      };

      // Start the loop
      updateVideoState();

      return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // --- SILENT TIMER LOGIC ---
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
        if (!isSocketOpenRef.current || isAiSpeakingRef.current) return;

        const now = Date.now();
        const session = sessionPromiseRef.current;
        if (!session) return;

        // 1. PART 2 PREPARATION (60s silent)
        if (currentPhaseRef.current === 'PART2_PREP') {
            const elapsed = (now - prepStartTimeRef.current) / 1000;
            if (elapsed >= 60) {
                console.log("Timer: Prep time over");
                currentPhaseRef.current = 'PART2_SPEAKING';
                setStatus("PART 2"); // Ensure UI updates
                turnStartTimeRef.current = Date.now(); 
                session.then(s => s.sendRealtimeInput({ 
                    content: [{ role: 'user', parts: [{ text: "SYSTEM: Preparation time is strictly over. Ask candidate to start speaking immediately." }] }] 
                }));
            }
            return;
        }

        const answerDuration = (now - turnStartTimeRef.current) / 1000;

        // 2. PART 1 LIMIT (25s per answer)
        if (currentPhaseRef.current === 'PART1') {
            if (answerDuration > 25) {
                turnStartTimeRef.current = Date.now();
                session.then(s => s.sendRealtimeInput({ 
                    content: [{ role: 'user', parts: [{ text: "SYSTEM: [HIDDEN TIMER] Candidate exceeded 25 seconds. Politely interrupt and move to next question." }] }] 
                }));
            }
        }

        // 3. PART 2 SPEAKING LIMIT (Max 120s)
        if (currentPhaseRef.current === 'PART2_SPEAKING') {
            if (answerDuration > 120) {
                currentPhaseRef.current = 'PART3'; 
                setStatus("PART 3");
                turnStartTimeRef.current = Date.now();
                session.then(s => s.sendRealtimeInput({ 
                    content: [{ role: 'user', parts: [{ text: "SYSTEM: [HIDDEN TIMER] Candidate exceeded 2 minutes. Interrupt politely, stop Part 2, and switch to Part 3." }] }] 
                }));
            }
        }

        // 4. PART 3 LIMIT (60s)
        if (currentPhaseRef.current === 'PART3') {
             if (answerDuration > 60) {
                turnStartTimeRef.current = Date.now();
                session.then(s => s.sendRealtimeInput({ 
                    content: [{ role: 'user', parts: [{ text: "SYSTEM: [HIDDEN TIMER] Answer exceeded 60s. Interrupt and move to next question." }] }] 
                }));
            }
        }

    }, 1000);

    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, []);

  // --- INIT ---
  const initExam = async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setError(null);
    setStatus("System Check...");
    isFinishedRef.current = false;

    try {
      // FIX: Replace process.env with import.meta.env for Vite
      const apiKey = (import.meta as any).env.VITE_GOOGLE_API_KEY;
      if (!apiKey) {
          throw new Error("API Key is missing. Check .env file.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

      // Audio Setup
      const outCtx = new AudioContextClass({ sampleRate: 24000 });
      const inCtx = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = outCtx;
      inputAudioContextRef.current = inCtx;
      
      await outCtx.resume();
      await inCtx.resume();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, echoCancellation: true, noiseSuppression: true }
      });
      streamRef.current = stream;

      // START VIDEO PRELOAD
      if (videoRef.current) {
          videoRef.current.play().then(() => {
              videoRef.current?.pause();
          }).catch(() => console.log("Video preload intercepted"));
      }

      setStatus("Waiting...");

      const systemInstruction = `
      ROLE: You are John, a strict but professional IELTS Speaking Examiner.
      CANDIDATE: ${user.firstName}.
      
      --- PHASE 0: WAIT FOR TRIGGER ---
      You must REMAIN SILENT initially. Do NOT speak until the user says a trigger phrase like "I am here", "I'm ready", "Hello John" or similar.
      Once triggered, say EXACTLY: "Good afternoon. My name is John. Could you tell me your full name please?" and immediately proceed to Part 1.

      --- PART 1: INTRODUCTION & INTERVIEW ---
      1. First ask for Full Name.
      2. Then ask questions on TWO (2) different topics.
         - Topic A (e.g., Hometown or Work/Study): Ask 3 questions.
         - Topic B (e.g., Hobbies, Weather, or Travel): Ask 3 questions.
      3. Total Questions in Part 1: ~6 questions + Introduction.
      4. Keep a steady pace. If you receive [SYSTEM: HIDDEN TIMER EXCEEDED], interrupt politely: "Thank you," and ask the next question.

      --- PART 2: CUE CARD (ONE TOPIC) ---
      1. Choose ONE specific topic. The topic must be "Personal" (e.g., "Describe a friend", "Describe a holiday", "Describe an item you bought").
      2. Say: "I would like you to talk about [Topic]. You have 1 minute to prepare."
      3. THEN REMAIN COMPLETELY SILENT for 60 seconds (Wait for System Prompt).
      4. After preparation, say "Your time is up. Please start speaking."
      5. Listen for 1-2 minutes.
      6. If [SYSTEM: HIDDEN TIMER EXCEEDED], interrupt: "Thank you. We will stop there." and move to Part 3.

      --- PART 3: DISCUSSION (EXACTLY 2 QUESTIONS) ---
      1. TRANSITION LOGIC: You must switch from "Personal/Storytelling" (Part 2) to "General/Society" (Part 3).
         - IF Part 2 was "Describe a friend" -> Part 3 MUST be about "Friendship in Society" (e.g., "Why are friendships important?").
         - IF Part 2 was "Describe a holiday" -> Part 3 MUST be about "Tourism/Travel impact on culture".
         - Do NOT ask personal questions ("Do you like...?"). Ask abstract questions ("Do people in your country...?", "How has society changed...?").
      2. QUANTITY: Ask EXACTLY TWO (2) questions in this part.
      3. After the user answers the 2nd question, say: "Thank you, that is the end of the speaking test." and STOP SPEAKING.

      --- CRITICAL RULES ---
      1. NO CHIT-CHAT.
      2. VISUALS: Maintain eye contact (simulated).
      3. LANGUAGE HANDLING: If the candidate speaks any language other than English (e.g., Uzbek, Russian), DO NOT REACT. DO NOT say "Please speak English". Simply ignore it, remain silent, or continue with the next question as if nothing happened.
      `;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            console.log("WS OPENED");
            isSocketOpenRef.current = true;
            setIsConnected(true);
            setStatus("Ready to Start");

            // Setup Mic Stream
            const source = inCtx.createMediaStreamSource(stream);
            const processor = inCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (isFinishedRef.current || !isSocketOpenRef.current || !isMicOn) return;
                // Don't send mic data if AI is speaking (prevents echo/interruption loop)
                if (isAiSpeakingRef.current) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const blob = pcmToGeminiBlob(inputData, 16000);
                
                sessionPromiseRef.current?.then(session => {
                    if (isSocketOpenRef.current) session.sendRealtimeInput({ media: blob });
                });
            };

            source.connect(processor);
            processor.connect(inCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (isFinishedRef.current) return;

            // 1. Handle Audio Output
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
               isAiSpeakingRef.current = true;
               // If AI starts speaking, it resets the user's "Turn Time"
               turnStartTimeRef.current = Date.now(); 

               const ctx = audioContextRef.current;
               if (ctx) {
                   const bytes = base64ToUint8Array(audioData);
                   const buffer = await decodeAudioData(bytes, ctx);
                   const source = ctx.createBufferSource();
                   source.buffer = buffer;
                   source.connect(ctx.destination);

                   const now = ctx.currentTime;
                   const nextStart = Math.max(now, nextStartTimeRef.current);
                   source.start(nextStart);
                   nextStartTimeRef.current = nextStart + buffer.duration;
                   
                   sourcesRef.current.add(source);
                   source.onended = () => {
                       sourcesRef.current.delete(source);
                       if (sourcesRef.current.size === 0) {
                           // AI finished speaking. Now it's User's turn.
                           // Reset turn timer for user
                           turnStartTimeRef.current = Date.now();
                           
                           setTimeout(() => { 
                               if (sourcesRef.current.size === 0) isAiSpeakingRef.current = false; 
                           }, 200);
                       }
                   };
               }
            }

            // 2. Transcription Logic & Phase Control
            if (msg.serverContent?.inputTranscription?.text) {
                const text = msg.serverContent.inputTranscription.text;
                const lowerText = text.toLowerCase();
                transcriptRef.current += `Candidate: ${text}\n`;

                // TRIGGER LOGIC
                if (currentPhaseRef.current === 'WAITING_FOR_TRIGGER') {
                    if (lowerText.includes("john") || lowerText.includes("here") || lowerText.includes("ready") || lowerText.includes("start")) {
                        console.log("TRIGGERED");
                        currentPhaseRef.current = 'PART1';
                        setStatus("PART 1");
                        // We rely on AI to hear this and respond per System Instruction
                    }
                }
            }

            if (msg.serverContent?.outputTranscription?.text) {
                const text = msg.serverContent.outputTranscription.text;
                transcriptRef.current += `Examiner: ${text}\n`;

                // Phase Detection based on keywords (Backup for Logic)
                const lower = text.toLowerCase();
                
                // Note: We use specific keywords AI is instructed to say to detect phase changes
                if (lower.includes("part 2") || lower.includes("topic card") || lower.includes("cue card") || lower.includes("1 minute to prepare")) {
                    currentPhaseRef.current = 'PART2_PREP';
                    setStatus("PART 2"); // Preparation
                    prepStartTimeRef.current = Date.now();
                }
                
                if (lower.includes("part 3") || lower.includes("discussion") || lower.includes("move on to part 3")) {
                    currentPhaseRef.current = 'PART3';
                    setStatus("PART 3");
                }
            }
          },
          onclose: (e) => { 
             console.log("Closed", e);
             setIsConnected(false);
          },
          onerror: (e) => {
              console.error(e);
              if (!isFinishedRef.current) setError("Connection Error. Check API Key.");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }, // Deep male voice
          systemInstruction: systemInstruction,
          inputAudioTranscription: {}, 
          outputAudioTranscription: {}, 
        }
      });

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Microphone Error");
      initializedRef.current = false;
    }
  };

  const handleFinish = async () => { stopExam(); onFinish(transcriptRef.current); };

  // --- RENDER ---
  
  if (!isConnected && !error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4">
             <div className="text-center animate-pulse">
                <div className="w-20 h-20 bg-cyan-900 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </div>
                <h2 className="text-xl text-white font-bold mb-2">Microphone Check</h2>
                <p className="text-slate-400 text-sm mb-6">Please ensure you are in a quiet room.</p>
                <button onClick={initExam} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-full transition shadow-lg shadow-cyan-500/30">
                    ENTER EXAM ROOM
                </button>
             </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4 overflow-hidden">
        {/* EXAMINER VIEW (VIDEO AVATAR) */}
        <div className="relative w-full max-w-4xl aspect-[4/3] md:aspect-video bg-slate-900 rounded-lg overflow-hidden shadow-2xl border border-slate-800">
             
             {/* HTML5 VIDEO ELEMENT */}
             <video
                ref={videoRef}
                src={VIDEO_SRC} 
                poster={POSTER_IMG}
                className="absolute inset-0 w-full h-full object-cover transform scale-105"
                loop
                muted 
                playsInline
                webkit-playsinline="true"
                onError={(e) => {
                    console.warn("Local video not found, switching to fallback.");
                    e.currentTarget.src = FALLBACK_VIDEO;
                }}
             />
             
             {/* Dark gradient overlay for professionalism */}
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>

             {/* PART LABEL (Top Left) */}
             <div className="absolute top-4 left-4 z-20">
                 <div className="flex items-center gap-2">
                     {/* Live Indicator Dot */}
                     <div className={`w-3 h-3 rounded-full border border-white/20 ${isSocketOpenRef.current ? 'bg-red-600 animate-pulse' : 'bg-slate-500'}`}></div>
                     
                     {/* The Status Label requested by user */}
                     <div className="bg-black/50 backdrop-blur-md px-4 py-1.5 rounded text-white font-bold text-lg tracking-widest border-l-4 border-red-600 uppercase">
                         {currentPhaseRef.current === 'WAITING_FOR_TRIGGER' ? 'WAITING...' : status}
                     </div>
                 </div>
                 {/* Optional Subtext for Prep Phase */}
                 {currentPhaseRef.current === 'PART2_PREP' && (
                     <div className="mt-1 ml-5 text-yellow-400 text-xs font-mono animate-pulse">PREPARATION TIME</div>
                 )}
             </div>

             {/* Speaking Indicator Border */}
             {isAiSpeakingRef.current && (
                 <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-lg pointer-events-none animate-pulse"></div>
             )}

             {/* Connection Error */}
             {error && (
                 <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
                     <div className="text-center p-6 bg-slate-900 border border-red-500 rounded-xl">
                         <p className="text-red-500 font-bold mb-4">{error}</p>
                         <button onClick={() => window.location.reload()} className="text-white bg-red-600 px-4 py-2 rounded">Retry</button>
                     </div>
                 </div>
             )}

             {/* Name Tag */}
             <div className="absolute bottom-6 right-6 bg-black/70 backdrop-blur-md px-5 py-2 rounded-lg border-l-4 border-cyan-500 z-10 shadow-lg">
                 <div className="text-white font-bold text-lg">John Anderson</div>
                 <div className="text-cyan-400 text-xs uppercase tracking-widest font-semibold">Senior IELTS Examiner</div>
             </div>
        </div>

        {/* USER CONTROLS */}
        <div className="mt-8 w-full max-w-xl flex items-center justify-between gap-4 p-4 bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 shadow-2xl">
             <div className="flex items-center gap-3">
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-red-500 text-white'}`}>
                     {isMicOn ? (
                         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                     ) : (
                         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                     )}
                 </div>
                 <div>
                     <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Microphone</div>
                     <div className={`text-sm font-bold ${isMicOn ? 'text-cyan-400' : 'text-red-400'}`}>{isMicOn ? 'Live & Listening' : 'Muted'}</div>
                 </div>
             </div>

             <div className="h-10 w-px bg-slate-700 mx-2"></div>

             <button onClick={handleFinish} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center gap-2 hover:scale-105 active:scale-95">
                 <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                 FINISH EXAM
             </button>
        </div>
        
        {currentPhaseRef.current === 'WAITING_FOR_TRIGGER' && (
            <div className="mt-6 bg-cyan-900/30 border border-cyan-500/30 text-cyan-200 px-6 py-3 rounded-full animate-pulse font-medium text-sm">
                Say <span className="text-white font-bold mx-1">"I am here, John"</span> to begin interview
            </div>
        )}
    </div>
  );
};

export default ExamRoom;
