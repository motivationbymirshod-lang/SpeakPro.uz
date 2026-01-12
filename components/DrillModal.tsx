
import React, { useState, useEffect, useRef } from 'react';

interface DrillModalProps {
    onClose: () => void;
}

const DrillModal: React.FC<DrillModalProps> = ({ onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [feedback, setFeedback] = useState<'waiting' | 'correct' | 'incorrect'>('waiting');
    
    // Web Speech API Refs
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

    const drills = [
        { phrase: "I am very happy.", improved: "I am over the moon." },
        { phrase: "It is raining heavily.", improved: "It is pouring down." },
        { phrase: "I agree with you.", improved: "We are on the same page." },
        { phrase: "It is expensive.", improved: "It costs an arm and a leg." }
    ];

    const currentDrill = drills[currentStep];

    useEffect(() => {
        // Initialize Speech Recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onresult = (event: any) => {
                const text = event.results[0][0].transcript;
                setTranscript(text);
                setIsListening(false);
                checkPronunciation(text);
            };

            recognition.onerror = (e: any) => {
                console.error("Speech error", e);
                setIsListening(false);
                alert("Could not hear you. Please try again.");
            };

            recognitionRef.current = recognition;
        } else {
            alert("Your browser does not support Speech Recognition. Please use Chrome.");
        }
    }, [currentStep]);

    const speak = (text: string) => {
        if (synthRef.current.speaking) {
            synthRef.current.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        synthRef.current.speak(utterance);
    };

    const startListening = () => {
        setTranscript('');
        setFeedback('waiting');
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const checkPronunciation = (spokenText: string) => {
        const target = currentDrill.improved.toLowerCase().replace(/[^a-z ]/g, "");
        const spoken = spokenText.toLowerCase().replace(/[^a-z ]/g, "");
        
        if (spoken.length > 5 && (target.includes(spoken) || spoken.includes(target) || spoken.split(' ').some(w => target.includes(w)))) {
            setFeedback('correct');
            speak("Excellent! " + currentDrill.improved);
        } else {
            setFeedback('incorrect');
            speak("Not quite. Try again.");
        }
    };

    const handleNext = () => {
        setFeedback('waiting');
        setTranscript('');
        if (currentStep < drills.length - 1) {
            setCurrentStep(s => s + 1);
        } else {
            alert("Workout Complete! +15 XP");
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
                
                <div className="flex flex-col items-center mb-8 pt-4">
                    <h2 className="text-xl font-bold text-white mb-6">Interactive Shadowing</h2>
                    
                    <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-2">Change this:</p>
                    <h3 className="text-xl text-slate-300 line-through decoration-red-500/50 mb-6">"{currentDrill.phrase}"</h3>
                    
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 w-full text-center">
                        <p className="text-cyan-400 text-xl font-bold">"{currentDrill.improved}"</p>
                    </div>

                    {/* VISUALIZER */}
                    <div className="h-16 w-full flex items-center justify-center gap-1 mb-6">
                        {isListening ? (
                            <>
                                {[...Array(10)].map((_, i) => (
                                    <div 
                                        key={i} 
                                        className="w-1.5 bg-cyan-500 rounded-full animate-pulse" 
                                        style={{ 
                                            height: `${Math.random() * 100}%`,
                                            animationDuration: `${0.2 + Math.random() * 0.3}s`
                                        }}
                                    ></div>
                                ))}
                            </>
                        ) : (
                            <div className="w-full h-[2px] bg-slate-800"></div>
                        )}
                    </div>

                    {/* Audio Controls */}
                    <div className="flex justify-center gap-6 mb-6 items-center">
                        <button 
                            onClick={() => speak(currentDrill.improved)}
                            className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors border border-slate-700 shadow-lg"
                            title="Listen"
                        >
                            🔊
                        </button>
                        <button 
                            onClick={startListening}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${isListening ? 'bg-red-600 animate-pulse scale-110 shadow-red-500/50' : 'bg-cyan-600 hover:bg-cyan-500 hover:scale-105 shadow-cyan-500/30'}`}
                            title="Speak Now"
                        >
                            <span className="text-4xl">🎙️</span>
                        </button>
                    </div>

                    {/* Feedback Area */}
                    <div className="min-h-[60px] text-center">
                        {isListening && <p className="text-cyan-400 animate-pulse font-mono uppercase tracking-widest text-xs">Listening...</p>}
                        {transcript && !isListening && (
                            <div className={`text-sm ${feedback === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                                <p className="mb-1 italic">"{transcript}"</p>
                                <p className="font-bold text-lg">{feedback === 'correct' ? "PERFECT MATCH! 🎉" : "Try again."}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                    <div className="text-slate-500 text-sm font-mono">Drill {currentStep + 1} / {drills.length}</div>
                    <button 
                        onClick={handleNext}
                        disabled={feedback !== 'correct'}
                        className="bg-white text-slate-900 px-6 py-2 rounded-lg font-bold hover:bg-cyan-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {currentStep === drills.length - 1 ? 'Finish' : 'Next →'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DrillModal;
