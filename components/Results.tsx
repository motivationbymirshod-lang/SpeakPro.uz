
import React, { useState } from 'react';
import { ExamResult, UserProfile } from '../types';
import { getCurrentUser, saveUser } from '../utils/storageUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import PaymentModal from './PaymentModal';

interface ResultsProps {
    result: ExamResult | null;
    onRestart: () => void;
}

const Results: React.FC<ResultsProps> = ({ result, onRestart }) => {
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(getCurrentUser());
    const [showPayment, setShowPayment] = useState(false);
    const [unlocking, setUnlocking] = useState(false);
    const [showModelAnswer, setShowModelAnswer] = useState(false);

    // Feedback State
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackSent, setFeedbackSent] = useState(false);

    if (!result) return <div className="p-8 text-center text-slate-400">Loading Detailed Analysis...</div>;

    const isLocked = result.isLocked;

    const handleUnlockClick = () => {
        if ((currentUser?.balance || 0) < 3000) {
            setShowPayment(true);
        } else {
            unlockResultDirectly();
        }
    };

    const unlockResultDirectly = async () => {
        if (!window.confirm("3,000 so'm evaziga natijani ochishni tasdiqlaysizmi?")) return;
        setUnlocking(true);
        try {
            const res = await fetch('https://speakpro-uz.onrender.com/api/wallet/purchase-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser?._id || currentUser?.id,
                    planId: 'unlock_result',
                    resultId: result._id
                })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Muvaffaqiyatli ochildi!");
                window.location.reload();
            } else {
                alert(data.message);
            }
        } catch (e) {
            alert("Error unlocking");
        } finally {
            setUnlocking(false);
        }
    };

    const addToDictionary = async (word: string) => {
        if(!currentUser) return;
        try {
            await fetch('https://speakpro-uz.onrender.com/api/user/dictionary/add', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    userId: currentUser._id,
                    word: word,
                    definition: "Saved from Exam Feedback",
                    example: "Review context in exam result."
                })
            });
            alert(`"${word}" lug'atga qo'shildi!`);
        } catch(e) { alert("Xatolik"); }
    };

    const submitFeedback = async () => {
        if (feedbackRating === 0) return;
        try {
            await fetch('https://speakpro-uz.onrender.com/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: currentUser?.email,
                    type: 'exam',
                    rating: feedbackRating,
                    message: feedbackText || "No text provided"
                })
            });
            setFeedbackSent(true);
        } catch (e) { console.error("Feedback error"); }
    };

    const radarData = [
        { subject: 'Fluency', A: result.fluency.score, fullMark: 9 },
        { subject: 'Lexical', A: result.lexical.score, fullMark: 9 },
        { subject: 'Grammar', A: result.grammar.score, fullMark: 9 },
        { subject: 'Pronunciation', A: result.pronunciation.score, fullMark: 9 },
    ];

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 mt-6 text-slate-900 dark:text-slate-200 animate-fade-in-up pb-20 relative transition-colors duration-300">

            {showPayment && currentUser && (
                <PaymentModal user={currentUser} onClose={() => setShowPayment(false)} />
            )}

            {/* COACH TIP HEADER */}
            {result.coachTip && !isLocked && (
                <div className="bg-gradient-to-r from-indigo-900 to-slate-900 border-l-4 border-indigo-500 p-6 rounded-r-xl mb-8 shadow-xl">
                    <h3 className="text-indigo-400 font-bold text-xs uppercase tracking-widest mb-2">💡 Coach's Top Tip</h3>
                    <p className="text-white text-lg font-medium italic">"{result.coachTip}"</p>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold dark:text-white text-slate-900 tracking-widest uppercase">Detailed <span className="text-cyan-600 dark:text-cyan-400">Feedback</span></h2>
                    {isLocked && <p className="text-xs text-red-500 font-bold uppercase tracking-wider">LOCKED PREVIEW</p>}
                </div>
                <div className="text-xs font-mono text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-full">
                    Verified by SpeakPro AI
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-8">
                {/* Main Score Card (ALWAYS VISIBLE) */}
                <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-700 relative overflow-hidden flex flex-col items-center justify-center bg-gradient-to-br from-white to-slate-100 dark:from-slate-900 dark:to-slate-800">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl"></div>

                    <div className="relative z-10 text-center">
                        <div className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Overall Band Score</div>
                        <div className="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600 dark:from-cyan-400 dark:to-blue-500 mb-2 drop-shadow-lg">
                            {result.overallBand}
                        </div>
                        {!isLocked && (
                            <div className="flex flex-wrap justify-center gap-2 mt-4">
                                {result.weaknessTags?.map((tag, i) => (
                                    <span key={i} className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-[10px] px-2 py-1 rounded uppercase tracking-wide">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Radar Chart Analysis */}
                <div className="lg:col-span-2 glass-card p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 relative overflow-hidden">
                    {isLocked && (
                        <div className="absolute inset-0 z-20 backdrop-blur-sm bg-white/60 dark:bg-black/80 flex flex-col items-center justify-center">
                            <div className="bg-slate-900/90 p-6 rounded-2xl text-center max-w-sm shadow-2xl border border-slate-700">
                                <div className="text-4xl mb-3">🔒</div>
                                <h3 className="text-xl font-bold text-white mb-2">Unlock Full Report</h3>
                                <p className="text-sm text-slate-300 mb-6">See your exact scores for Fluency, Vocabulary, Grammar, and Pronunciation.</p>
                                <button onClick={handleUnlockClick} className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 px-8 rounded-full shadow-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 w-full">
                                    <span>Unlock (3,000 UZS)</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <h3 className="text-sm text-slate-500 dark:text-slate-400 uppercase mb-2 pl-4">Skill Breakdown</h3>

                    <div className={`h-64 w-full transition-all duration-300 ${isLocked ? 'blur-md opacity-50' : ''}`}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#94a3b8" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 9]} tick={false} axisLine={false} />
                                <Radar name="Score" dataKey="A" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* BAND 9.0 MODEL ANSWER (NEW) */}
            {!isLocked && result.band9Response && (
                <div className="mb-8">
                    <button 
                        onClick={() => setShowModelAnswer(!showModelAnswer)}
                        className="w-full flex items-center justify-between bg-gradient-to-r from-green-900 to-emerald-900 border border-green-700/50 p-4 rounded-xl text-white hover:bg-green-800 transition-all shadow-lg group"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🏆</span>
                            <div className="text-left">
                                <div className="font-bold text-lg">Compare with Band 9.0</div>
                                <div className="text-xs text-green-300">See how a native speaker would answer this topic.</div>
                            </div>
                        </div>
                        <span className={`transform transition-transform ${showModelAnswer ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    
                    {showModelAnswer && (
                        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-b-xl mt-1 animate-fade-in">
                            <p className="text-slate-300 leading-relaxed italic whitespace-pre-line border-l-2 border-green-500 pl-4">
                                {result.band9Response}
                            </p>
                            <div className="mt-4 flex gap-2">
                                <button onClick={() => addToDictionary("Advanced Vocab")} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded border border-slate-700">Save Vocabulary from this answer</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* DETAILED CRITERIA GRID (LOCKED) */}
            <div className={`grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 transition-all relative ${isLocked ? 'pointer-events-none select-none' : ''}`}>
                {isLocked && (
                    <div className="absolute inset-0 z-20 backdrop-blur-sm bg-white/10 dark:bg-black/20 rounded-2xl flex items-center justify-center border border-white/20"></div>
                )}
                {[
                    { title: 'Fluency', data: result.fluency, color: 'text-green-600 dark:text-green-400', border: 'border-green-500/30' },
                    { title: 'Lexical', data: result.lexical, color: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/30' },
                    { title: 'Grammar', data: result.grammar, color: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
                    { title: 'Pronunciation', data: result.pronunciation, color: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' },
                ].map((item, idx) => (
                    <div key={idx} className={`bg-white dark:bg-slate-900 p-5 rounded-xl border ${item.border} hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm ${isLocked ? 'blur-[4px]' : ''}`}>
                        <div className="flex justify-between items-end mb-2">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300">{item.title}</h4>
                            <span className={`text-2xl font-bold ${item.color}`}>{item.data.score}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.data.comments}</p>
                    </div>
                ))}
            </div>

            {/* Personalized Drills (LOCKED) */}
            <div className="mb-10 transition-all relative">
                <h3 className="text-xl font-bold dark:text-white text-slate-900 mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    Personalized Drills Generator
                </h3>

                {isLocked && (
                    <div className="absolute inset-0 top-10 z-20 backdrop-blur-md bg-white/40 dark:bg-black/60 rounded-xl flex flex-col items-center justify-center text-center p-6 border border-slate-200 dark:border-slate-800">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Drills are Locked</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Unlock to practice your specific weak points.</p>
                        <button onClick={handleUnlockClick} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2 rounded-full font-bold shadow-lg">Unlock Now</button>
                    </div>
                )}

                <div className={`grid md:grid-cols-3 gap-6 ${isLocked ? 'blur-[5px]' : ''}`}>
                    {result.drills?.map((drill, idx) => (
                        <div key={idx} className="glass-card p-5 rounded-xl border-l-4 border-orange-500 bg-white/60 dark:bg-slate-900/60">
                            <h4 className="font-bold text-orange-600 dark:text-orange-400 mb-2">{drill.title}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{drill.instruction}</p>
                            <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded text-xs font-mono text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                                <span className="text-green-600 dark:text-green-500">Example:</span> {drill.example}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* FEEDBACK SECTION (Rate this Exam) */}
            {!isLocked && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 mb-10 flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Rate AI Accuracy</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Did the AI examiner grade you fairly? Your feedback improves the system.</p>
                    </div>

                    <div className="flex-1 w-full md:w-auto">
                        {!feedbackSent ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex justify-center md:justify-start gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            onClick={() => setFeedbackRating(star)}
                                            className={`text-2xl transition-transform hover:scale-110 ${star <= feedbackRating ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        placeholder="Optional comment..."
                                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                                    />
                                    <button
                                        onClick={submitFeedback}
                                        disabled={feedbackRating === 0}
                                        className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded font-bold text-sm disabled:opacity-50"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-green-500 font-bold text-sm flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Feedback Received. Thank you!
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-12 text-center">
                <button onClick={onRestart} className="bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-cyan-50 text-white dark:text-slate-900 font-bold py-4 px-12 rounded-full transition shadow-[0_0_30px_rgba(0,0,0,0.2)] dark:shadow-[0_0_30px_rgba(255,255,255,0.2)] transform hover:scale-105">
                    START NEW EXAM
                </button>
                <p className="text-xs text-slate-500 mt-2">Ready to improve further?</p>
            </div>
        </div>
    );
};

export default Results;
