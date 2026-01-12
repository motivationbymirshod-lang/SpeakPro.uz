
import React, { useEffect, useState } from 'react';
import { UserProfile, DictionaryItem } from '../types';
import { logoutUser, saveUser } from '../utils/storageUtils';
import PaymentModal from './PaymentModal';
import DrillModal from './DrillModal';
import { SELF_TARIFFS } from '../config/selfTariffs';

interface DashboardProps {
    user: UserProfile;
    onStartExam: (mode: 'random' | 'forecast') => void;
    onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user: initialUser, onStartExam, onLogout }) => {
    // --- STATE MANAGEMENT ---
    const [user, setUser] = useState(initialUser);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // UI Toggles
    const [showPayment, setShowPayment] = useState(false);
    const [showDrill, setShowDrill] = useState(false);
    const [showDictionary, setShowDictionary] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false); // B2B check
    const [showTopicModal, setShowTopicModal] = useState(false); // NEW: Topic Selector
    
    // Async Actions
    const [purchasing, setPurchasing] = useState(false);
    const [verifyingEmail, setVerifyingEmail] = useState(false);
    const [isSavingPass, setIsSavingPass] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    // Growth Data
    const [dictionary, setDictionary] = useState<DictionaryItem[]>(user.dictionary || []);
    const [roadmapStep, setRoadmapStep] = useState(1);
    const [streak, setStreak] = useState(1);

    // Marketing Triggers
    const [examDate, setExamDate] = useState<string | null>(localStorage.getItem('target_exam_date'));
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [offerTime, setOfferTime] = useState(900); // 15 min offer
    const [liveMsg, setLiveMsg] = useState("Azizbek just scored Band 7.5 🎉");

    // --- LOGIC ---

    const refreshUser = async () => {
        try {
            // Heartbeat
            fetch('https://speakpro-uz.onrender.com/api/user/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email })
            }).catch(() => { });

            const res = await fetch(`https://speakpro-uz.onrender.com/api/user/${user.email}`);
            if (res.ok) {
                const updatedUser = await res.json();
                setUser(updatedUser);
                setDictionary(updatedUser.dictionary || []);
                saveUser(updatedUser);
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        refreshUser();
        
        // Mock Streak Logic (Simple Days since join)
        const daysSinceJoin = Math.floor((new Date().getTime() - new Date(user.joinedAt || Date.now()).getTime()) / (1000 * 3600 * 24));
        setStreak(daysSinceJoin > 0 ? daysSinceJoin + 1 : 1);

        // Fetch History
        fetch(`https://speakpro-uz.onrender.com/api/history?email=${user.email}`)
            .then(res => res.json())
            .then(data => {
                setHistory(data);
                // Calculate Roadmap Step based on history count
                const examsTaken = data.length || 0;
                setRoadmapStep(Math.min(5, examsTaken + 1));
            })
            .catch(console.error)
            .finally(() => setLoading(false));

        // Marketing Timers
        const messages = [
            "Malika PRO paket sotib oldi 🚀",
            "Jamshid Band 7.0 oldi 👏",
            "124 student hozir online 🟢",
            "Shaxzoda 1-imtihonini topshirdi 📝",
            "Sardor Speakingdan 6.5 dan 7.5 ga chiqdi 📈"
        ];
        const ticker = setInterval(() => {
            setLiveMsg(messages[Math.floor(Math.random() * messages.length)]);
        }, 5000);

        const offer = setInterval(() => {
            setOfferTime(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => { clearInterval(ticker); clearInterval(offer); };
    }, []);

    useEffect(() => {
        if (!examDate) return;
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = new Date(examDate).getTime() - now;
            if (distance < 0) {
                setTimeLeft("IMTIHON KUNI!");
            } else {
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                setTimeLeft(`${days} kun qoldi`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [examDate]);

    // --- HANDLERS ---

    const handleSetExamDate = (e: React.ChangeEvent<HTMLInputElement>) => {
        setExamDate(e.target.value);
        localStorage.setItem('target_exam_date', e.target.value);
    };

    const handleLogout = () => { logoutUser(); onLogout(); };

    const handleVerifyEmail = async () => {
        setVerifyingEmail(true);
        try {
            const res = await fetch('https://speakpro-uz.onrender.com/api/user/send-verification-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id || user.id })
            });
            if (res.ok) alert(`${user.email} ga tasdiqlash havolasini yubordik!`);
            else alert("Xatolik");
        } catch (e) { alert("Server xatosi"); }
        finally { setVerifyingEmail(false); }
    };

    const handleRemoveWord = async (word: string) => {
        try {
            await fetch(`https://speakpro-uz.onrender.com/api/user/dictionary/${user._id}/${word}`, { method: 'DELETE' });
            setDictionary(prev => prev.filter(w => w.word !== word));
        } catch(e) { alert("Error removing word"); }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if(newPassword.length < 6) {
            alert("Parol kamida 6 belgidan iborat bo'lishi kerak");
            return;
        }
        setIsSavingPass(true);
        try {
            const res = await fetch('https://speakpro-uz.onrender.com/api/user/update-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id || user.id, newPassword })
            });
            if (res.ok) {
                alert("Parol yangilandi!");
                setNewPassword('');
                setShowSettings(false);
            } else {
                alert("Xatolik");
            }
        } catch (e) { alert("Xatolik"); }
        finally { setIsSavingPass(false); }
    };

    // Pre-check before opening modal
    const handleStartClick = (e: React.MouseEvent) => {
        e.preventDefault();
        
        // B2B Check
        if (user.teacherId) {
            if (user.examsLeft && user.examsLeft > 0) setShowTopicModal(true);
            else setShowStudentModal(true);
            return;
        }

        // Free/Paid Check
        const hasCredits = user.examsLeft && user.examsLeft > 0;
        if (!user.hasPaidHistory && !user.hasUsedFreeTrial && !user.isEmailVerified) {
            alert("Bepul imtihonni boshlash uchun avval Emailingizni tasdiqlang.");
            return;
        }

        if (hasCredits) setShowTopicModal(true);
        else setShowPayment(true);
    };

    // Actual Start from Modal
    const confirmStartExam = (mode: 'random' | 'forecast') => {
        setShowTopicModal(false);
        onStartExam(mode);
    };

    const handleBuyPlan = async (planId: string) => {
        let cost = 0;
        switch (planId) {
            case SELF_TARIFFS.ONE_EXAM.id: cost = SELF_TARIFFS.ONE_EXAM.price; break;
            case SELF_TARIFFS.FIVE_EXAMS.id: cost = SELF_TARIFFS.FIVE_EXAMS.price; break;
            case SELF_TARIFFS.PRO_SUBSCRIPTION.id: cost = SELF_TARIFFS.PRO_SUBSCRIPTION.price; break;
        }

        if (user.balance < cost) {
            setShowPayment(true);
            return;
        }

        if (!window.confirm(`Balansdan ${cost.toLocaleString()} so'm yechiladi. Davom etasizmi?`)) return;

        setPurchasing(true);
        try {
            const res = await fetch('https://speakpro-uz.onrender.com/api/wallet/purchase-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id || user.id, planId })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Muvaffaqiyatli xarid qilindi!");
                setUser(data.user);
                saveUser(data.user);
            } else {
                alert(data.message);
            }
        } catch (e) { alert("Xatolik"); }
        finally { setPurchasing(false); }
    };

    const formatOfferTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const isPro = user.subscriptionPlan === 'pro';
    const isManagedStudent = !!user.teacherId;
    const showFreeTrialBanner = !isManagedStudent && !user.hasPaidHistory && !user.hasUsedFreeTrial;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 pb-20 font-sans selection:bg-cyan-500/30 transition-colors duration-300">
            {/* 1. LIVE TICKER */}
            <div className="bg-slate-900 text-slate-400 text-[10px] py-1 text-center border-b border-slate-800 tracking-wider overflow-hidden">
                <span className="animate-pulse inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                {liveMsg}
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-8">
                {/* 2. HEADER & NAVBAR */}
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-xl relative ${isPro ? 'bg-gradient-to-br from-yellow-500 to-orange-600' : 'bg-gradient-to-br from-cyan-600 to-blue-600'}`}>
                            {user.firstName[0]}
                            {isPro && <div className="absolute -top-2 -right-2 bg-white text-orange-600 text-[10px] px-2 py-0.5 rounded-full font-bold border border-orange-100 uppercase">PRO</div>}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Salom, <span className={isPro ? "text-yellow-400" : "text-cyan-400"}>{user.firstName}</span></h1>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                                    Target: {user.targetLevel}
                                </p>
                                {/* EXAM DATE */}
                                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 relative group cursor-pointer hover:border-red-500 transition-colors">
                                    {timeLeft ? (
                                        <span className="text-[10px] font-bold text-red-400 animate-pulse uppercase tracking-wide">⏳ {timeLeft}</span>
                                    ) : (
                                        <span className="text-[10px] text-slate-400 group-hover:text-red-500">Imtihon qachon?</span>
                                    )}
                                    <input type="date" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleSetExamDate} value={examDate || ''} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        {/* Streak */}
                        <div className="bg-orange-900/10 border border-orange-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                            <span className="text-xl">🔥</span>
                            <div>
                                <div className="text-[10px] text-orange-400 font-bold uppercase leading-none">Streak</div>
                                <div className="text-sm font-bold text-white leading-none">{streak} kun</div>
                            </div>
                        </div>

                        {/* Balance */}
                        {!isManagedStudent && (
                            <div onClick={() => setShowPayment(true)} className="cursor-pointer bg-slate-900 border border-slate-700 hover:border-cyan-500 px-5 py-2.5 rounded-xl flex items-center gap-3 transition-all group">
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Balans</div>
                                    <div className="text-base font-bold text-white font-mono group-hover:text-cyan-400">{(user.balance || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">UZS</span></div>
                                </div>
                            </div>
                        )}

                        <button onClick={() => setShowSettings(true)} className="bg-slate-900 border border-slate-700 p-3 rounded-xl hover:bg-slate-800 transition-colors text-slate-400 hover:text-white">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        <button onClick={handleLogout} className="text-xs font-bold text-slate-500 hover:text-red-400 transition-colors border border-slate-800 px-5 py-3 rounded-xl hover:bg-slate-900">CHIQISH</button>
                    </div>
                </header>

                {/* 3. SKILL TREE (The "Gym") */}
                <div className="mb-10 animate-fade-in-up">
                    <div className="flex justify-between items-end mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-2xl">🗺️</span> Your Road to Band {user.targetLevel}
                        </h2>
                        <span className="text-xs text-slate-500 font-mono">Current Phase: {roadmapStep}/5</span>
                    </div>
                    
                    <div className="relative">
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 rounded-full z-0 hidden md:block"></div>
                        <div className="absolute top-1/2 left-0 h-1 bg-cyan-600 -translate-y-1/2 rounded-full z-0 hidden md:block transition-all duration-1000" style={{ width: `${(roadmapStep-1)*25}%` }}></div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10">
                            {[
                                { id: 1, title: "Diagnostic", status: "Done" },
                                { id: 2, title: "Fluency Base", status: "In Progress" },
                                { id: 3, title: "Vocab Expansion", status: "Locked" },
                                { id: 4, title: "Grammar Range", status: "Locked" },
                                { id: 5, title: "Final Polish", status: "Locked" }
                            ].map((step) => {
                                const isCompleted = roadmapStep > step.id;
                                const isCurrent = roadmapStep === step.id;
                                return (
                                    <div key={step.id} className={`flex md:flex-col items-center gap-4 md:gap-2 p-4 rounded-xl border transition-all duration-300 ${isCurrent ? 'bg-slate-900 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)] scale-105' : (isCompleted ? 'bg-slate-900/50 border-green-500/30' : 'bg-slate-950 border-slate-800 opacity-60')}`}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 ${isCompleted ? 'bg-green-500 border-green-500 text-slate-900' : (isCurrent ? 'bg-cyan-600 border-cyan-400 text-white animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-500')}`}>
                                            {isCompleted ? '✓' : step.id}
                                        </div>
                                        <div className="text-left md:text-center">
                                            <div className={`font-bold text-sm ${isCurrent ? 'text-cyan-400' : 'text-slate-300'}`}>{step.title}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{isCompleted ? 'Completed' : (isCurrent ? 'Current Goal' : 'Locked')}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 4. NOTIFICATIONS */}
                {isManagedStudent && user.homework && !user.homework.isCompleted && (
                    <div className="mb-6 bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden animate-fade-in-up">
                        <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] px-3 py-1 rounded-bl-xl font-bold uppercase">Yangi Vazifa</div>
                        <h3 className="text-lg font-bold text-indigo-400 mb-2">📚 O'qituvchidan Xabar:</h3>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-slate-900/50 p-4 rounded-xl border border-slate-800">{user.homework.text}</p>
                    </div>
                )}

                {showFreeTrialBanner && !user.isEmailVerified && (
                    <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 animate-pulse">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">!</div>
                            <div>
                                <h4 className="font-bold text-red-500">Emailingizni tasdiqlang</h4>
                                <p className="text-xs text-red-400">Bepul imtihonni ishlatish uchun emailingiz tasdiqlangan bo'lishi shart.</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleVerifyEmail} disabled={verifyingEmail} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-full text-sm font-bold">{verifyingEmail ? 'Yuborilmoqda...' : 'Link yuborish'}</button>
                            <button onClick={refreshUser} className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2 rounded-full text-sm font-bold">Tekshirish ⟳</button>
                        </div>
                    </div>
                )}

                {/* 5. GAMIFICATION & MAIN ACTIONS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                    
                    {/* A. START EXAM (Big Card) */}
                    <div onClick={handleStartClick} role="button" className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-8 cursor-pointer shadow-2xl shadow-cyan-500/20 group transform transition-all hover:scale-[1.01]">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col justify-between h-full min-h-[200px]">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-sm border border-white/10">AI EXAMINER 3.0</div>
                                    <div className="animate-pulse bg-red-500 w-3 h-3 rounded-full"></div>
                                </div>
                                <h2 className="text-3xl font-bold mb-2">Imtihon Topshirish</h2>
                                <p className="text-cyan-100 text-sm">{user.examsLeft && user.examsLeft > 0 ? `Sizda ${user.examsLeft} ta imtihon mavjud.` : "Start Free Trial or Top Up."}</p>
                            </div>
                            <div className="flex justify-between items-end mt-4">
                                <div className="text-xs bg-white/10 px-2 py-1 rounded">~15 daqiqa</div>
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-cyan-600 transition-colors shadow-lg group-hover:scale-110">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* B. DAILY CHALLENGE (Gamification) */}
                    <div className="lg:col-span-1 bg-purple-900/20 border border-purple-500/30 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Daily Quest</span>
                                <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">NEW</span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Part 1 Challenge</h3>
                            <p className="text-xs text-slate-400">Javob bering: "Do you prefer working alone or in a group?"</p>
                        </div>
                        <button onClick={() => setShowDrill(true)} className="mt-4 w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-xl font-bold text-sm shadow-lg shadow-purple-500/20 transition-colors">
                            Answer Now (+10 XP)
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                    {/* C. LEADERBOARD (Gamification) */}
                    <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <span>🏆</span> Top Students (This Week)
                        </h3>
                        <div className="space-y-3">
                            {[
                                { n: "Malika S.", s: "7.5", x: "🔥" },
                                { n: "Jamshid K.", s: "7.0", x: "⚡" },
                                { n: "Sardor B.", s: "7.0", x: "🚀" }
                            ].map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i===0?'bg-yellow-500 text-black': 'bg-slate-700 text-slate-300'}`}>{i+1}</div>
                                        <span className="text-sm text-slate-300">{s.n}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-cyan-400">{s.s}</span>
                                        <span className="text-xs">{s.x}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="text-center pt-2">
                                <span className="text-xs text-slate-500">You are in top 15%</span>
                            </div>
                        </div>
                    </div>

                    {/* D. DRILLS & DICTIONARY */}
                    <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
                        <div onClick={() => setShowDrill(true)} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl cursor-pointer hover:border-purple-500 transition-colors group relative overflow-hidden">
                            <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-400 text-2xl border border-purple-500/20">🏋️‍♀️</div>
                                <span className="text-[10px] bg-purple-900/50 text-purple-300 px-3 py-1 rounded-full font-bold uppercase">Micro-Drill</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Audio Workout</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">Listen and repeat. Perfect your pronunciation in 2 mins.</p>
                        </div>

                        <div onClick={() => setShowDictionary(true)} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl cursor-pointer hover:border-yellow-500 transition-colors group relative overflow-hidden">
                            <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-yellow-900/30 rounded-xl flex items-center justify-center text-yellow-400 text-2xl border border-yellow-500/20">📚</div>
                                <span className="text-[10px] bg-yellow-900/50 text-yellow-300 px-3 py-1 rounded-full font-bold uppercase">My Vault</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Shaxsiy Lug'at</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">Imtihondan saqlab olingan {dictionary.length} ta so'zni takrorlash.</p>
                        </div>
                    </div>
                </div>

                {/* 6. URGENCY OFFER BANNER (If not paid) */}
                {!isManagedStudent && !user.hasPaidHistory && (
                    <div className="mb-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-[2px] shadow-2xl animate-pulse-slow">
                        <div className="bg-slate-900 rounded-[14px] p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-red-900/30 text-red-400 p-3 rounded-xl font-mono font-bold text-2xl border border-red-800">{formatOfferTime(offerTime)}</div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-red-500 uppercase tracking-wider text-sm">One-Time Offer</h4>
                                        <span className="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded animate-pulse">EXPIRING SOON</span>
                                    </div>
                                    <p className="text-white font-bold text-lg leading-tight mt-1">Get <span className="text-indigo-400">5 Exam Pack</span> with Priority Analysis</p>
                                    <p className="text-xs text-slate-500 mt-1">Usually 45,000. Now only 39,000 UZS.</p>
                                </div>
                            </div>
                            <button onClick={() => handleBuyPlan(SELF_TARIFFS.FIVE_EXAMS.id)} className="w-full md:w-auto bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-red-500/30">Claim Offer</button>
                        </div>
                    </div>
                )}

                {/* 7. SHOP SECTION */}
                {!isManagedStudent && (
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">Do'kon</h3>
                            {!isPro && (!user.examsLeft || user.examsLeft === 0) && <span className="text-xs text-red-500 font-medium animate-pulse">Sizda imtihon qolmadi!</span>}
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {/* 1 Exam */}
                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col hover:border-cyan-400 transition-all group">
                                <div className="mb-4"><span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">Start</span></div>
                                <h4 className="font-bold text-lg text-white mb-2">{SELF_TARIFFS.ONE_EXAM.title}</h4>
                                <p className="text-xs text-slate-400 mb-6 flex-1">{SELF_TARIFFS.ONE_EXAM.description}</p>
                                <div className="border-t border-slate-800 pt-4">
                                    <div className="flex justify-between items-center mb-4"><span className="text-2xl font-bold text-white">{SELF_TARIFFS.ONE_EXAM.price.toLocaleString()}</span><span className="text-xs text-slate-400">so'm</span></div>
                                    <button onClick={() => handleBuyPlan(SELF_TARIFFS.ONE_EXAM.id)} disabled={purchasing} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-sm transition-colors">Sotib Olish</button>
                                </div>
                            </div>

                            {/* 5 Exams (Highlight) */}
                            <div className="relative bg-gradient-to-b from-cyan-900 to-slate-900 border border-cyan-500/50 p-6 rounded-3xl flex flex-col shadow-2xl shadow-cyan-900/20 transform md:-translate-y-2">
                                <div className="absolute top-0 right-0 bg-cyan-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">ENG KO'P SOTILADIGAN</div>
                                <h4 className="font-bold text-lg text-white mb-2">{SELF_TARIFFS.FIVE_EXAMS.title}</h4>
                                <p className="text-xs text-cyan-100/70 mb-6 flex-1">{SELF_TARIFFS.FIVE_EXAMS.description}</p>
                                <div className="border-t border-white/10 pt-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <div><span className="text-xs text-slate-400 line-through mr-2">45,000</span><span className="text-3xl font-bold text-white">{SELF_TARIFFS.FIVE_EXAMS.price.toLocaleString()}</span></div>
                                        <span className="text-xs text-cyan-200">so'm</span>
                                    </div>
                                    <button onClick={() => handleBuyPlan(SELF_TARIFFS.FIVE_EXAMS.id)} disabled={purchasing} className="w-full bg-cyan-500 hover:bg-cyan-400 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/30 transition-colors">Paketni Olish</button>
                                </div>
                            </div>

                            {/* PRO */}
                            <div className="bg-slate-900 border border-yellow-500/30 p-6 rounded-3xl flex flex-col relative overflow-hidden group hover:border-yellow-500/60 transition-all">
                                <h4 className="font-bold text-lg text-white mb-2">{SELF_TARIFFS.PRO_SUBSCRIPTION.title}</h4>
                                <p className="text-xs text-slate-400 mb-6 flex-1">{SELF_TARIFFS.PRO_SUBSCRIPTION.description}</p>
                                <div className="border-t border-slate-800 pt-4">
                                    <div className="flex justify-between items-center mb-4"><span className="text-2xl font-bold text-white">{SELF_TARIFFS.PRO_SUBSCRIPTION.price.toLocaleString()}</span><span className="text-xs text-slate-400">so'm / oy</span></div>
                                    <button onClick={() => handleBuyPlan(SELF_TARIFFS.PRO_SUBSCRIPTION.id)} disabled={purchasing} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 transition-colors">Obuna Bo'lish</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODALS */}
                {showPayment && <PaymentModal user={user} onClose={() => setShowPayment(false)} />}
                {showDrill && <DrillModal onClose={() => setShowDrill(false)} />}
                
                {/* TOPIC SELECTION MODAL */}
                {showTopicModal && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500"></div>
                            
                            <h3 className="text-2xl font-bold text-white mb-6 text-center">Select Exam Topic</h3>
                            
                            <div className="grid gap-4 mb-6">
                                <button onClick={() => confirmStartExam('random')} className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500 transition-all group">
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-2xl group-hover:bg-cyan-900/30">🎲</div>
                                    <div className="text-left">
                                        <div className="font-bold text-white text-lg">Random Topics</div>
                                        <div className="text-slate-500 text-xs">Standard mix of common IELTS questions.</div>
                                    </div>
                                </button>

                                <button onClick={() => confirmStartExam('forecast')} className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-900/20 to-slate-900 border border-purple-500/50 hover:border-purple-400 transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl">HOT</div>
                                    <div className="w-12 h-12 bg-purple-900/50 rounded-full flex items-center justify-center text-2xl border border-purple-500/30">🔥</div>
                                    <div className="text-left">
                                        <div className="font-bold text-white text-lg">Jan-Apr 2025 Forecast</div>
                                        <div className="text-slate-400 text-xs">Most recent questions reported by students.</div>
                                    </div>
                                </button>
                            </div>

                            <button onClick={() => setShowTopicModal(false)} className="w-full text-slate-500 hover:text-white text-sm">Cancel</button>
                        </div>
                    </div>
                )}

                {showDictionary && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex justify-end">
                        <div className="w-full md:w-[400px] h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col animate-fade-in">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white">📖 My Dictionary</h2>
                                <button onClick={() => setShowDictionary(false)} className="text-slate-400 hover:text-white">✕</button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4">
                                {dictionary.length === 0 ? (
                                    <div className="text-center text-slate-500 py-10">
                                        <div className="text-4xl mb-4">📭</div>
                                        <p>Your dictionary is empty.</p>
                                    </div>
                                ) : (
                                    dictionary.map((item, idx) => (
                                        <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 group relative">
                                            <button onClick={() => handleRemoveWord(item.word)} className="absolute top-2 right-2 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">✕</button>
                                            <h4 className="text-lg font-bold text-cyan-400 mb-1">{item.word}</h4>
                                            <p className="text-sm text-slate-300 italic mb-2">{item.definition}</p>
                                            <div className="text-xs text-slate-500 bg-slate-900 p-2 rounded border border-slate-800">"{item.example}"</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {showSettings && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="glass-card bg-slate-900 w-full max-w-md p-8 rounded-2xl border border-slate-700 shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Profil Sozlamalari</h3>
                                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">✕</button>
                            </div>
                            <form onSubmit={handleUpdatePassword}>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Yangi Parol</label>
                                <input type="password" required placeholder="Yangi parol kiriting..." value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all mb-6" />
                                <button type="submit" disabled={isSavingPass} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50">
                                    {isSavingPass ? 'Saqlanmoqda...' : 'Parolni Yangilash'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {showStudentModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-sm text-center shadow-2xl">
                            <div className="w-16 h-16 bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">!</div>
                            <h3 className="text-xl font-bold text-white mb-2">Imtihon qolmadi</h3>
                            <p className="text-slate-400 text-sm mb-6">Davom ettirish uchun o'qituvchingizga murojaat qiling.</p>
                            <button onClick={() => setShowStudentModal(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold">Tushunarli</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
