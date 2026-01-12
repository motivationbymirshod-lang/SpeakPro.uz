
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
    const [loading, setLoading] = useState(true);
    
    // UI Toggles
    const [showPayment, setShowPayment] = useState(false);
    const [showDrill, setShowDrill] = useState(false);
    const [showDictionary, setShowDictionary] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [showTopicModal, setShowTopicModal] = useState(false);
    
    // Emergency & Planning
    const [emergencyMode, setEmergencyMode] = useState(false);
    const [examDate, setExamDate] = useState<string>(user.examDate || localStorage.getItem('target_exam_date') || '');
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [dailyTasks, setDailyTasks] = useState<any[]>([]);

    // Async Actions
    const [purchasing, setPurchasing] = useState(false);
    const [verifyingEmail, setVerifyingEmail] = useState(false);
    const [isSavingPass, setIsSavingPass] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    // Marketing Triggers
    const [dictionary, setDictionary] = useState<DictionaryItem[]>(user.dictionary || []);
    const [streak, setStreak] = useState(1);
    const [offerTime, setOfferTime] = useState(900); 
    const [liveMsg, setLiveMsg] = useState("Azizbek just scored Band 7.5 🎉");

    const refreshUser = async () => {
        try {
            const res = await fetch(`https://speakpro-uz.onrender.com/api/user/${user.email}`);
            if (res.ok) {
                const updatedUser = await res.json();
                setUser(updatedUser);
                setDictionary(updatedUser.dictionary || []);
                if(updatedUser.examDate) setExamDate(new Date(updatedUser.examDate).toISOString().split('T')[0]);
                saveUser(updatedUser);
            }
        } catch (e) { console.error(e); }
    };

    // GENERATE STUDY PLAN
    useEffect(() => {
        if (!examDate) {
            setDailyTasks([
                { day: "Day 1", task: "Take Diagnostic Mock", status: "pending" },
                { day: "Day 2", task: "Set Exam Date to unlock Plan", status: "locked" }
            ]);
            return;
        }

        const today = new Date();
        const target = new Date(examDate);
        const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24));

        if (diffDays <= 3 && !emergencyMode) {
            // Suggest Emergency Mode
            // setEmergencyMode(true); // Can prompt user instead
        }

        const tasks = [];
        const taskTypes = emergencyMode 
            ? ["Forecast Part 1", "Forecast Part 2", "Vocab Cramming", "Full Mock"]
            : ["Part 1 Drill", "Listening Shadowing", "Part 2 Simulation", "Part 3 Logic", "Full Mock"];

        // Generate next 5 days
        for (let i = 0; i < 5; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const isToday = i === 0;
            
            tasks.push({
                date: d.toLocaleDateString(),
                weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
                task: taskTypes[i % taskTypes.length],
                status: isToday ? "active" : "locked",
                isToday: isToday
            });
        }
        setDailyTasks(tasks);

        // Countdown Logic
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = target.getTime() - now;
            if (distance < 0) {
                setTimeLeft("IMTIHON KUNI!");
            } else {
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                setTimeLeft(`${days} kun qoldi`);
            }
        }, 1000);
        return () => clearInterval(interval);

    }, [examDate, emergencyMode]);

    useEffect(() => {
        refreshUser();
        const daysSinceJoin = Math.floor((new Date().getTime() - new Date(user.joinedAt || Date.now()).getTime()) / (1000 * 3600 * 24));
        setStreak(daysSinceJoin > 0 ? daysSinceJoin + 1 : 1);

        const ticker = setInterval(() => {
            setLiveMsg(["Malika PRO paket sotib oldi 🚀", "Jamshid Band 7.0 oldi 👏", "124 student online 🟢"][Math.floor(Math.random()*3)]);
        }, 5000);
        const offer = setInterval(() => setOfferTime(prev => (prev > 0 ? prev - 1 : 0)), 1000);
        return () => { clearInterval(ticker); clearInterval(offer); };
    }, []);

    const handleSetExamDate = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const d = e.target.value;
        setExamDate(d);
        localStorage.setItem('target_exam_date', d);
        
        // Save to DB
        await fetch('https://speakpro-uz.onrender.com/api/user/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user._id || user.id, examDate: d })
        });
    };

    const handleStartClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (user.teacherId) {
            if (user.examsLeft && user.examsLeft > 0) setShowTopicModal(true);
            else setShowStudentModal(true);
            return;
        }
        const hasCredits = user.examsLeft && user.examsLeft > 0;
        if (!user.hasPaidHistory && !user.hasUsedFreeTrial && !user.isEmailVerified) {
            alert("Bepul imtihonni boshlash uchun avval Emailingizni tasdiqlang.");
            return;
        }
        if (hasCredits) setShowTopicModal(true);
        else setShowPayment(true);
    };

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

    const handleRemoveWord = async (word: string) => {
        try {
            const res = await fetch(`https://speakpro-uz.onrender.com/api/user/dictionary/${user._id || user.id}/${word}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                const updatedDict = await res.json();
                setDictionary(updatedDict);
                const updatedUser = { ...user, dictionary: updatedDict };
                setUser(updatedUser);
                saveUser(updatedUser);
            }
        } catch (e) { console.error(e); }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword) return;
        setIsSavingPass(true);
        try {
            const res = await fetch('https://speakpro-uz.onrender.com/api/user/update-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id || user.id, newPassword })
            });
            if (res.ok) {
                alert("Parol muvaffaqiyatli o'zgartirildi!");
                setShowSettings(false);
                setNewPassword('');
            } else {
                alert("Xatolik yuz berdi");
            }
        } catch (e) { alert("Aloqa yo'q"); }
        finally { setIsSavingPass(false); }
    };

    // UI Helpers
    const formatOfferTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };
    
    const handleLogout = () => { logoutUser(); onLogout(); };
    const isPro = user.subscriptionPlan === 'pro';
    const isManagedStudent = !!user.teacherId;
    const showFreeTrialBanner = !isManagedStudent && !user.hasPaidHistory && !user.hasUsedFreeTrial;

    // --- RENDER ---
    return (
        <div className={`min-h-screen pb-20 font-sans selection:bg-cyan-500/30 transition-colors duration-300 ${emergencyMode ? 'bg-red-950 text-red-100' : 'bg-slate-950 text-slate-200'}`}>
            {/* 1. LIVE TICKER */}
            <div className={`${emergencyMode ? 'bg-red-900 border-red-800' : 'bg-slate-900 border-slate-800'} text-[10px] py-1 text-center border-b tracking-wider overflow-hidden`}>
                <span className="animate-pulse inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                {liveMsg}
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-8">
                {/* 2. HEADER & NAVBAR */}
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-xl relative ${emergencyMode ? 'bg-red-600 text-white' : (isPro ? 'bg-gradient-to-br from-yellow-500 to-orange-600 text-white' : 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white')}`}>
                            {user.firstName[0]}
                            {isPro && <div className="absolute -top-2 -right-2 bg-white text-orange-600 text-[10px] px-2 py-0.5 rounded-full font-bold border border-orange-100 uppercase">PRO</div>}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Salom, <span className={emergencyMode ? "text-red-400" : (isPro ? "text-yellow-400" : "text-cyan-400")}>{user.firstName}</span></h1>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-xs opacity-70 flex items-center gap-1">
                                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                                    Target: {user.targetLevel}
                                </p>
                                {/* EXAM DATE */}
                                <div className={`flex items-center gap-2 border rounded-lg px-2 py-0.5 relative group cursor-pointer transition-colors ${emergencyMode ? 'bg-red-900 border-red-700' : 'bg-slate-900 border-slate-800 hover:border-red-500'}`}>
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
                        {/* Emergency Toggle */}
                        <button 
                            onClick={() => setEmergencyMode(!emergencyMode)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${emergencyMode ? 'bg-red-600 border-red-500 text-white animate-pulse' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-red-500 hover:border-red-500'}`}
                        >
                            {emergencyMode ? '⚠️ PANIC MODE ON' : '🚨 EMERGENCY MODE'}
                        </button>

                        {!isManagedStudent && (
                            <div onClick={() => setShowPayment(true)} className="cursor-pointer bg-slate-900 border border-slate-700 hover:border-cyan-500 px-5 py-2.5 rounded-xl flex items-center gap-3 transition-all group">
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Balans</div>
                                    <div className="text-base font-bold text-white font-mono group-hover:text-cyan-400">{(user.balance || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">UZS</span></div>
                                </div>
                            </div>
                        )}
                        <button onClick={handleLogout} className="text-xs font-bold text-slate-500 hover:text-red-400 transition-colors border border-slate-800 px-5 py-3 rounded-xl hover:bg-slate-900">EXIT</button>
                    </div>
                </header>

                {/* 3. SMART STUDY PLAN (Timeline) */}
                <div className="mb-10 animate-fade-in-up">
                    <div className="flex justify-between items-end mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-2xl">{emergencyMode ? '🔥' : '📅'}</span> 
                            {emergencyMode ? "INTENSIVE CRASH COURSE" : "Smart Study Plan"}
                        </h2>
                        <span className="text-xs opacity-60 font-mono">{examDate ? `Target: ${examDate}` : "Set date to activate"}</span>
                    </div>
                    
                    <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
                        {dailyTasks.map((task, idx) => (
                            <div key={idx} className={`min-w-[140px] flex-1 p-4 rounded-xl border flex flex-col justify-between transition-all ${task.isToday ? (emergencyMode ? 'bg-red-900/50 border-red-500 shadow-red-500/20 shadow-lg scale-105' : 'bg-cyan-900/20 border-cyan-500 shadow-cyan-500/20 shadow-lg scale-105') : 'bg-slate-900 border-slate-800 opacity-60'}`}>
                                <div>
                                    <div className={`text-xs uppercase font-bold mb-1 ${task.isToday ? 'text-white' : 'text-slate-500'}`}>{task.day || task.weekday}</div>
                                    <div className="text-xs text-slate-400">{task.date}</div>
                                </div>
                                <div className="mt-4">
                                    <div className={`font-bold text-sm leading-tight ${task.isToday ? 'text-white' : 'text-slate-400'}`}>{task.task}</div>
                                    {task.isToday && (
                                        <button 
                                            onClick={task.task.includes("Drill") ? () => setShowDrill(true) : () => setShowTopicModal(true)}
                                            className={`mt-3 w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wide ${emergencyMode ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}
                                        >
                                            Start Now
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. MAIN ACTIONS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                    {/* A. START EXAM (Big Card) */}
                    <div onClick={handleStartClick} role="button" className={`lg:col-span-2 relative overflow-hidden rounded-3xl text-white p-8 cursor-pointer shadow-2xl group transform transition-all hover:scale-[1.01] ${emergencyMode ? 'bg-gradient-to-r from-red-700 to-orange-700 shadow-red-500/30' : 'bg-gradient-to-r from-cyan-600 to-blue-600 shadow-cyan-500/20'}`}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col justify-between h-full min-h-[200px]">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-sm border border-white/10">AI EXAMINER 3.0</div>
                                    <div className="animate-pulse bg-white w-3 h-3 rounded-full"></div>
                                </div>
                                <h2 className="text-3xl font-bold mb-2">{emergencyMode ? "HOT SEAT EXAM" : "Imtihon Topshirish"}</h2>
                                <p className="opacity-80 text-sm">{user.examsLeft && user.examsLeft > 0 ? `Sizda ${user.examsLeft} ta imtihon mavjud.` : "Top up to start."}</p>
                            </div>
                            <div className="flex justify-between items-end mt-4">
                                <div className="text-xs bg-white/10 px-2 py-1 rounded">~15 daqiqa</div>
                                <div className={`w-14 h-14 bg-white rounded-full flex items-center justify-center transition-colors shadow-lg group-hover:scale-110 ${emergencyMode ? 'text-red-600' : 'text-cyan-600'}`}>
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* B. DAILY CHALLENGE */}
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

                {/* 5. GAMIFICATION & TOOLS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                    <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-6">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><span>🏆</span> Top Students</h3>
                        <div className="space-y-3">
                            {[{ n: "Malika S.", s: "7.5" }, { n: "Jamshid K.", s: "7.0" }, { n: "Sardor B.", s: "7.0" }].map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i===0?'bg-yellow-500 text-black': 'bg-slate-700 text-slate-300'}`}>{i+1}</div>
                                        <span className="text-sm text-slate-300">{s.n}</span>
                                    </div>
                                    <span className="text-xs font-bold text-cyan-400">{s.s}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
                        <div onClick={() => setShowDrill(true)} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl cursor-pointer hover:border-purple-500 transition-colors group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-400 text-2xl border border-purple-500/20">🏋️‍♀️</div>
                                <span className="text-[10px] bg-purple-900/50 text-purple-300 px-3 py-1 rounded-full font-bold uppercase">Visual</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Shadowing Gym</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">Listen and repeat. Visual audio feedback included.</p>
                        </div>

                        <div onClick={() => setShowDictionary(true)} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl cursor-pointer hover:border-yellow-500 transition-colors group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-yellow-900/30 rounded-xl flex items-center justify-center text-yellow-400 text-2xl border border-yellow-500/20">📚</div>
                                <span className="text-[10px] bg-yellow-900/50 text-yellow-300 px-3 py-1 rounded-full font-bold uppercase">Vault</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">My Dictionary</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">{dictionary.length} saved words.</p>
                        </div>
                    </div>
                </div>

                {/* 6. URGENCY OFFER */}
                {!isManagedStudent && !user.hasPaidHistory && (
                    <div className="mb-12 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-[2px] shadow-2xl animate-pulse-slow">
                        <div className="bg-slate-900 rounded-[14px] p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-red-900/30 text-red-400 p-3 rounded-xl font-mono font-bold text-2xl border border-red-800">{formatOfferTime(offerTime)}</div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-red-500 uppercase tracking-wider text-sm">One-Time Offer</h4>
                                        <span className="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded animate-pulse">EXPIRING</span>
                                    </div>
                                    <p className="text-white font-bold text-lg leading-tight mt-1">Get <span className="text-indigo-400">5 Exam Pack</span></p>
                                </div>
                            </div>
                            <button onClick={() => handleBuyPlan(SELF_TARIFFS.FIVE_EXAMS.id)} className="w-full md:w-auto bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold">Claim Offer</button>
                        </div>
                    </div>
                )}

                {/* 7. SHOP */}
                {!isManagedStudent && (
                    <div className="mb-12">
                        <h3 className="text-xl font-bold text-white mb-6">Do'kon</h3>
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* 1 Exam */}
                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col hover:border-cyan-400 transition-all group">
                                <h4 className="font-bold text-lg text-white mb-2">{SELF_TARIFFS.ONE_EXAM.title}</h4>
                                <div className="border-t border-slate-800 pt-4 mt-auto">
                                    <div className="flex justify-between items-center mb-4"><span className="text-2xl font-bold text-white">{SELF_TARIFFS.ONE_EXAM.price.toLocaleString()}</span></div>
                                    <button onClick={() => handleBuyPlan(SELF_TARIFFS.ONE_EXAM.id)} disabled={purchasing} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-sm transition-colors">Sotib Olish</button>
                                </div>
                            </div>
                            {/* 5 Exams */}
                            <div className="relative bg-gradient-to-b from-cyan-900 to-slate-900 border border-cyan-500/50 p-6 rounded-3xl flex flex-col shadow-2xl">
                                <div className="absolute top-0 right-0 bg-cyan-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">BEST</div>
                                <h4 className="font-bold text-lg text-white mb-2">{SELF_TARIFFS.FIVE_EXAMS.title}</h4>
                                <div className="border-t border-white/10 pt-4 mt-auto">
                                    <div className="flex justify-between items-center mb-4"><span className="text-3xl font-bold text-white">{SELF_TARIFFS.FIVE_EXAMS.price.toLocaleString()}</span></div>
                                    <button onClick={() => handleBuyPlan(SELF_TARIFFS.FIVE_EXAMS.id)} disabled={purchasing} className="w-full bg-cyan-500 hover:bg-cyan-400 text-white py-3 rounded-xl font-bold text-sm shadow-lg">Paketni Olish</button>
                                </div>
                            </div>
                            {/* PRO */}
                            <div className="bg-slate-900 border border-yellow-500/30 p-6 rounded-3xl flex flex-col group hover:border-yellow-500/60 transition-all">
                                <h4 className="font-bold text-lg text-white mb-2">{SELF_TARIFFS.PRO_SUBSCRIPTION.title}</h4>
                                <div className="border-t border-slate-800 pt-4 mt-auto">
                                    <div className="flex justify-between items-center mb-4"><span className="text-2xl font-bold text-white">{SELF_TARIFFS.PRO_SUBSCRIPTION.price.toLocaleString()}</span></div>
                                    <button onClick={() => handleBuyPlan(SELF_TARIFFS.PRO_SUBSCRIPTION.id)} disabled={purchasing} className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white py-3 rounded-xl font-bold text-sm shadow-lg">Obuna Bo'lish</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODALS */}
                {showPayment && <PaymentModal user={user} onClose={() => setShowPayment(false)} />}
                {showDrill && <DrillModal onClose={() => setShowDrill(false)} />}
                
                {showTopicModal && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden">
                            <h3 className="text-2xl font-bold text-white mb-6 text-center">Select Exam Topic</h3>
                            <div className="grid gap-4 mb-6">
                                <button onClick={() => confirmStartExam('random')} className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500 transition-all group">
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-2xl group-hover:bg-cyan-900/30">🎲</div>
                                    <div className="text-left">
                                        <div className="font-bold text-white text-lg">Random Topics</div>
                                        <div className="text-slate-500 text-xs">Standard mix.</div>
                                    </div>
                                </button>
                                <button onClick={() => confirmStartExam('forecast')} className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-900/20 to-slate-900 border border-purple-500/50 hover:border-purple-400 transition-all group">
                                    <div className="w-12 h-12 bg-purple-900/50 rounded-full flex items-center justify-center text-2xl border border-purple-500/30">🔥</div>
                                    <div className="text-left">
                                        <div className="font-bold text-white text-lg">Jan-Apr 2025 Forecast</div>
                                        <div className="text-slate-400 text-xs">Most recent questions.</div>
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
                                {dictionary.length === 0 ? <div className="text-center text-slate-500 py-10">Empty.</div> : dictionary.map((item, idx) => (
                                    <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 group relative">
                                        <button onClick={() => handleRemoveWord(item.word)} className="absolute top-2 right-2 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">✕</button>
                                        <h4 className="text-lg font-bold text-cyan-400 mb-1">{item.word}</h4>
                                        <p className="text-sm text-slate-300 italic mb-2">{item.definition}</p>
                                        <div className="text-xs text-slate-500 bg-slate-900 p-2 rounded border border-slate-800">"{item.example}"</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {showSettings && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="glass-card bg-slate-900 w-full max-w-md p-8 rounded-2xl border border-slate-700 shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Settings</h3>
                                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">✕</button>
                            </div>
                            <form onSubmit={handleUpdatePassword}>
                                <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                                <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white mb-6" />
                                <button type="submit" disabled={isSavingPass} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl">Update</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
