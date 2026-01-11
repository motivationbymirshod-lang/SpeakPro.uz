
import React, { useEffect, useState } from 'react';
import { UserProfile, ExamResult } from '../types';
import { logoutUser, saveUser } from '../utils/storageUtils';
import PaymentModal from './PaymentModal';
import { SELF_TARIFFS } from '../config/selfTariffs';


interface DashboardProps {
    user: UserProfile;
    onStartExam: () => void;
    onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user: initialUser, onStartExam, onLogout }) => {
    const [user, setUser] = useState(initialUser);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPayment, setShowPayment] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [showStudentModal, setShowStudentModal] = useState(false); // Modal for B2B students
    const [verifyingEmail, setVerifyingEmail] = useState(false);
    
    // Settings & Password Change
    const [showSettings, setShowSettings] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [isSavingPass, setIsSavingPass] = useState(false);

    // Gamification States
    const [streak, setStreak] = useState(0);

    // MARKETING TRIGGERS
    const [examDate, setExamDate] = useState<string | null>(localStorage.getItem('target_exam_date'));
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [offerTime, setOfferTime] = useState(900); // 15 minutes in seconds
    const [liveMsg, setLiveMsg] = useState("Azizbek just scored Band 7.5 🎉");

    // EXTRACTED: Refresh logic to be called manually or on mount
    const refreshUser = async () => {
        try {
            fetch('https://speakpro-uz.onrender.com/api/user/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email })
            }).catch(() => { });

            const res = await fetch(`https://speakpro-uz.onrender.com/api/user/${user.email}`);
            if (res.ok) {
                const updatedUser = await res.json();
                setUser(updatedUser);
                saveUser(updatedUser);
            }
        } catch (e) { console.error(e); }
    };

    // Calculate Streak based on history (Simple simulation for now)
    // In a real app, this should come from the backend
    useEffect(() => {
        // Mock Streak Logic: If joined < 1 day ago -> 1, else calc from history dates
        const daysSinceJoin = Math.floor((new Date().getTime() - new Date(user.joinedAt || Date.now()).getTime()) / (1000 * 3600 * 24));
        setStreak(daysSinceJoin > 0 ? daysSinceJoin + 1 : 1);
    }, [user.joinedAt]);

    // Refresh user data (balance/plan) on mount AND Send Heartbeat
    useEffect(() => {
        refreshUser();
        
        // Live Ticker Logic
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

        // Limited Offer Timer
        const offer = setInterval(() => {
            setOfferTime(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => { clearInterval(ticker); clearInterval(offer); };
    }, []); // Only on mount

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await fetch(`https://speakpro-uz.onrender.com/api/history?email=${user.email}`);
                if (response.ok) {
                    const data = await response.json();
                    setHistory(data);
                }
            } catch (e) {
                console.error("Failed to fetch history");
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [user.email]);

    // Exam Countdown Logic
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

    const handleSetExamDate = (e: React.ChangeEvent<HTMLInputElement>) => {
        setExamDate(e.target.value);
        localStorage.setItem('target_exam_date', e.target.value);
    };

    const formatOfferTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleLogout = () => {
        logoutUser();
        onLogout();
    };

    const handleVerifyEmail = async () => {
        setVerifyingEmail(true);
        try {
            // Changed endpoint to 'send-verification-email'
            const res = await fetch('https://speakpro-uz.onrender.com/api/user/send-verification-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id || user.id })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`${user.email} ga tasdiqlash havolasini yubordik! Pochtangizni tekshiring (Spam papkasini ham).`);
            } else {
                alert(data.message || "Xatolik yuz berdi");
            }
        } catch (e) { alert("Server xatosi"); }
        finally { setVerifyingEmail(false); }
    };

    const handleStartExam = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // 1. Check if user is B2B Student
        if (user.teacherId) {
            if (user.examsLeft && user.examsLeft > 0) {
                onStartExam();
            } else {
                setShowStudentModal(true);
            }
            return;
        }

        // 2. Check Self-Registered User Logic
        const hasCredits = user.examsLeft && user.examsLeft > 0;

        // Free Trial Check
        if (!user.hasPaidHistory && !user.hasUsedFreeTrial) {
            if (!user.isEmailVerified) {
                alert("Bepul imtihonni boshlash uchun avval Emailingizni tasdiqlang (Dashboarddagi tugmani bosing).");
                return;
            }
        }

        if (hasCredits) {
            onStartExam();
        } else {
            setShowPayment(true);
        }
    };

    const handleBuyPlan = async (planId: string) => {
        // Get price from config
        let cost = 0;
        switch (planId) {
            case SELF_TARIFFS.ONE_EXAM.id: cost = SELF_TARIFFS.ONE_EXAM.price; break;
            case SELF_TARIFFS.FIVE_EXAMS.id: cost = SELF_TARIFFS.FIVE_EXAMS.price; break;
            case SELF_TARIFFS.PRO_SUBSCRIPTION.id: cost = SELF_TARIFFS.PRO_SUBSCRIPTION.price; break;
            case SELF_TARIFFS.UNLOCK_RESULT.id: cost = SELF_TARIFFS.UNLOCK_RESULT.price; break;
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
                body: JSON.stringify({ userId: user._id || user.id, planId, resultId: history[0]?._id })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Muvaffaqiyatli xarid qilindi!");
                setUser(data.user);
                saveUser(data.user);
                if (planId === SELF_TARIFFS.UNLOCK_RESULT.id) window.location.reload();
                setShowPayment(false);
            } else {
                alert(data.message || "Xatolik");
            }
        } catch (e) { alert("Internet aloqasi yo'q"); }
        finally { setPurchasing(false); }
    };

    // CHANGE PASSWORD HANDLER
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
            const data = await res.json();
            if (res.ok) {
                alert("Parol muvaffaqiyatli yangilandi!");
                setNewPassword('');
                setShowSettings(false);
            } else {
                alert(data.message);
            }
        } catch (e) { alert("Xatolik yuz berdi"); }
        finally { setIsSavingPass(false); }
    };

    const isPro = user.subscriptionPlan === 'pro';
    const lastExam = history.length > 0 ? history[0] : null;
    const isManagedStudent = !!user.teacherId;
    const showFreeTrialBanner = !isManagedStudent && !user.hasPaidHistory && !user.hasUsedFreeTrial;
    
    // Progress Logic
    const currentScore = lastExam ? lastExam.overallBand : parseFloat(user.currentLevel || '5.0');
    const targetScore = parseFloat(user.targetLevel || '7.5');
    const progressPercent = Math.min(100, Math.max(10, ((currentScore - 4) / (targetScore - 4)) * 100)); // Normalized 4.0 - Target

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 pb-20 transition-colors duration-300 font-sans">
            {/* LIVE SOCIAL PROOF TICKER */}
            <div className="bg-slate-900 text-slate-400 text-[10px] py-1 text-center border-b border-slate-800 tracking-wider overflow-hidden">
                <span className="animate-pulse inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                {liveMsg}
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-8">
                {/* HEADER */}
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 py-4 gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-xl relative ${isPro ? 'bg-gradient-to-br from-yellow-500 to-orange-600 shadow-orange-500/20' : 'bg-gradient-to-br from-cyan-600 to-blue-600 shadow-cyan-500/30'}`}>
                            {user.firstName[0]}
                            {isPro && (
                                <div className="absolute -top-2 -right-2 bg-white text-orange-600 text-[10px] px-2 py-0.5 rounded-full font-bold border border-orange-100 shadow-sm uppercase tracking-wide">PRO</div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Xush kelibsiz, <span className={isPro ? "text-yellow-600 dark:text-yellow-400" : "text-cyan-600 dark:text-cyan-400"}>{user.firstName}</span></h1>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                                    Maqsad: {user.targetLevel}
                                </p>
                                
                                {/* EXAM DATE INPUT (URGENCY TRIGGER) */}
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 relative group cursor-pointer hover:border-red-500 transition-colors">
                                    {timeLeft ? (
                                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 animate-pulse uppercase tracking-wide">⏳ {timeLeft}</span>
                                    ) : (
                                        <span className="text-[10px] text-slate-400 group-hover:text-red-500">Imtihon qachon?</span>
                                    )}
                                    <input 
                                        type="date" 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                        onChange={handleSetExamDate}
                                        value={examDate || ''}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        {/* STREAK WIDGET */}
                        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-500/20 px-4 py-2 rounded-xl flex items-center gap-2" title={`${streak} kunlik seriya`}>
                            <span className="text-xl">🔥</span>
                            <div>
                                <div className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase leading-none">Streak</div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white leading-none">{streak} kun</div>
                            </div>
                        </div>

                        {!isManagedStudent && (
                            <div
                                onClick={() => setShowPayment(true)}
                                className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-cyan-500/50 px-5 py-2.5 rounded-xl flex items-center gap-3 transition-all group shadow-sm hover:shadow-md"
                            >
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Balans</div>
                                    <div className="text-base font-bold text-slate-900 dark:text-white font-mono group-hover:text-cyan-600 dark:group-hover:text-cyan-400">{(user.balance || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">UZS</span></div>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={() => setShowSettings(true)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400"
                            title="Sozlamalar & Parol"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>

                        <button onClick={handleLogout} className="text-xs font-bold text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-slate-200 dark:border-slate-800 px-5 py-3 rounded-xl hover:border-red-500/50 hover:bg-slate-100 dark:hover:bg-slate-900">
                            CHIQISH
                        </button>
                    </div>
                </header>

                {/* PROGRESS BAR (MOTIVATION) */}
                <div className="mb-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Mening O'sishim</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-slate-900 dark:text-white">{currentScore}</span>
                                <span className="text-slate-400 text-sm">/ {targetScore}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-cyan-600 font-bold text-sm">{Math.round(progressPercent)}% Maqsadga erishildi</span>
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                    {currentScore < targetScore && (
                        <p className="mt-3 text-xs text-slate-500">
                            💡 {targetScore} ballga chiqish uchun kamida yana <span className="font-bold text-slate-700 dark:text-slate-300">5 ta imtihon</span> topshirish tavsiya etiladi.
                        </p>
                    )}
                </div>

                {/* TEACHER ASSIGNED TASKS */}
                {isManagedStudent && user.homework && !user.homework.isCompleted && (
                    <div className="mb-6 bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden animate-fade-in-up">
                        <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] px-3 py-1 rounded-bl-xl font-bold uppercase">Yangi Vazifa</div>
                        <h3 className="text-lg font-bold text-indigo-400 mb-2 flex items-center gap-2">
                            📚 O'qituvchidan Xabar:
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                            {user.homework.text}
                        </p>
                    </div>
                )}

                {/* EMAIL VERIFICATION WARNING FOR FREE TRIAL */}
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
                            <button
                                onClick={handleVerifyEmail}
                                disabled={verifyingEmail}
                                className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-full text-sm font-bold"
                            >
                                {verifyingEmail ? 'Yuborilmoqda...' : 'Link yuborish'}
                            </button>
                            {/* NEW: Refresh button to manually check if user clicked the link in email */}
                            <button
                                onClick={refreshUser}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2 rounded-full text-sm font-bold"
                                title="Agar emailni tasdiqlab bo'lgan bo'lsangiz bosing"
                            >
                                Tekshirish ⟳
                            </button>
                        </div>
                    </div>
                )}

                {/* FREE TRIAL BANNER (For Verified Users) */}
                {showFreeTrialBanner && user.isEmailVerified && (
                    <div
                        className="mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden animate-pulse-slow cursor-pointer"
                        onClick={handleStartExam}
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold mb-1">🎁 1 ta BEPUL imtihon sizni kutmoqda!</h3>
                                <p className="text-indigo-100 text-sm">Overall Band Score bepul. Boshlash uchun bosing.</p>
                            </div>
                            <button type="button" className="bg-white text-indigo-600 px-6 py-2 rounded-full font-bold shadow-lg hover:bg-indigo-50 transition-colors">
                                Boshlash
                            </button>
                        </div>
                    </div>
                )}

                {/* MAIN ACTION GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                    {/* Start Exam Card - ACTION ORIENTED */}
                    <div
                        onClick={handleStartExam}
                        role="button"
                        className="lg:col-span-1 relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-8 cursor-pointer shadow-2xl shadow-cyan-500/20 group transform transition-all hover:scale-[1.01]"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col justify-between h-full min-h-[220px]">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-sm border border-white/10">AI EXAMINER 3.0</div>
                                    <div className="animate-pulse bg-red-500 w-3 h-3 rounded-full"></div>
                                </div>
                                <h2 className="text-3xl font-bold mb-2">Imtihon Topshirish</h2>
                                {isManagedStudent ? (
                                    <p className="text-cyan-100 text-sm">Sizda <span className="font-bold text-white text-lg mx-1">{user.examsLeft || 0}</span> ta imtihon bor.</p>
                                ) : (
                                    <p className="text-cyan-100 text-sm max-w-md">
                                        {user.examsLeft && user.examsLeft > 0
                                            ? `Sizda ${user.examsLeft} ta imtihon mavjud.`
                                            : "Balansingizni to'ldiring yoki bepul sinovdan foydalaning."}
                                    </p>
                                )}
                            </div>
                            <div className="flex justify-between items-end mt-4">
                                <div className="text-xs bg-white/10 px-2 py-1 rounded">~15 daqiqa</div>
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-cyan-600 transition-colors shadow-lg group-hover:scale-110">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DETAILED ANALYSIS CARD - WITH TEASER FOR LOCKED CONTENT */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col relative overflow-hidden shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Oxirgi Natija Tahlili</h3>
                            {lastExam && (
                                <span className="text-xs text-slate-400">{new Date(lastExam.date).toLocaleDateString()}</span>
                            )}
                        </div>

                        {!lastExam ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                                <div className="text-4xl mb-2">📊</div>
                                <p>Hali imtihon topshirmadingiz.</p>
                                <button type="button" onClick={handleStartExam} className="mt-4 text-cyan-600 text-sm font-bold hover:underline">Birinchi imtihonni boshlash</button>
                            </div>
                        ) : (
                            <div className="relative">
                                {/* LOCK OVERLAY - TEASER STYLE */}
                                {lastExam.isLocked && (
                                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/10 dark:bg-slate-900/60 backdrop-blur-sm rounded-xl border border-white/20">
                                        <div className="bg-slate-900/90 p-6 rounded-2xl text-center max-w-sm border border-slate-700 shadow-2xl">
                                            <div className="text-3xl mb-3">🔒</div>
                                            <h4 className="text-lg font-bold text-white mb-2">To'liq analiz yashirilgan</h4>
                                            <p className="text-sm text-slate-300 mb-4">
                                                AI sizning <span className="text-red-400 font-bold">3 ta asosiy grammatik xatoyingizni</span> topdi. Ko'rish uchun natijani oching.
                                            </p>
                                            <button
                                                onClick={() => handleBuyPlan(SELF_TARIFFS.UNLOCK_RESULT.id)}
                                                className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transform hover:scale-105 transition-all"
                                            >
                                                Ochish (3,000 so'm)
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className={`grid md:grid-cols-2 gap-6 ${lastExam.isLocked ? 'blur-sm select-none opacity-50' : ''}`}>
                                    {/* Left: Scores */}
                                    <div>
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-extrabold shadow-lg">
                                                {lastExam.overallBand}
                                            </div>
                                            <div>
                                                <div className="text-sm text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Overall Band</div>
                                                <div className="text-xs text-slate-400 mt-1">Target: {user.targetLevel}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { l: 'Fluency', s: lastExam.fluencyScore || 6.5, c: 'text-green-500' },
                                                { l: 'Lexical', s: lastExam.lexicalScore || 6.0, c: 'text-yellow-500' },
                                                { l: 'Grammar', s: lastExam.grammarScore || 5.5, c: 'text-blue-500' },
                                                { l: 'Pronun.', s: lastExam.pronunciationScore || 6.0, c: 'text-purple-500' }
                                            ].map((sc, i) => (
                                                <div key={i} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                                    <div className="text-[10px] text-slate-400 uppercase font-bold">{sc.l}</div>
                                                    <div className={`text-xl font-bold ${sc.c}`}>{sc.s}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Right: Advice & Weaknesses */}
                                    <div className="flex flex-col h-full">
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-3 flex-1 border border-slate-100 dark:border-slate-700">
                                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Examiner's Advice</h5>
                                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-4">
                                                {lastExam.generalAdvice || "Your vocabulary is good, but you hesitate too often. Try to use more connecting words to improve fluency."}
                                            </p>
                                        </div>

                                        <div>
                                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Identified Weaknesses</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {(lastExam.weaknessTags?.length ? lastExam.weaknessTags : ["Tense Consistency", "Pausing", "Monotone"]).map((tag: string, i: number) => (
                                                    <span key={i} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-1 rounded border border-red-100 dark:border-red-900/30">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* SPECIAL URGENCY OFFER BANNER (If not paid) */}
                {!isManagedStudent && !user.hasPaidHistory && (
                    <div className="mb-10 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-[2px] shadow-2xl animate-pulse-slow">
                        <div className="bg-white dark:bg-slate-900 rounded-[14px] p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-xl font-mono font-bold text-2xl border border-red-200 dark:border-red-800">
                                    {formatOfferTime(offerTime)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-red-600 dark:text-red-500 uppercase tracking-wider text-sm">One-Time Offer</h4>
                                        <span className="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded animate-pulse">EXPIRING SOON</span>
                                    </div>
                                    <p className="text-slate-900 dark:text-white font-bold text-lg leading-tight mt-1">
                                        Get <span className="text-indigo-500">5 Exam Pack</span> with Priority Analysis
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">Usually 45,000. Now only 39,000 UZS.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleBuyPlan(SELF_TARIFFS.FIVE_EXAMS.id)} 
                                className="w-full md:w-auto bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-red-500/30"
                            >
                                Claim Offer
                            </button>
                        </div>
                    </div>
                )}

                {/* SALES / UPGRADE SECTION (HIDDEN FOR B2B STUDENTS) */}
                {!isManagedStudent && (
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Do'kon</h3>
                            {!isPro && (!user.examsLeft || user.examsLeft === 0) && <span className="text-xs text-red-500 font-medium animate-pulse">Sizda imtihon qolmadi!</span>}
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {/* 1 Exam - Low Friction Entry */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex flex-col hover:border-cyan-400 transition-all group">
                                <div className="mb-4">
                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">Start</span>
                                </div>
                                <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{SELF_TARIFFS.ONE_EXAM.title}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 flex-1">{SELF_TARIFFS.ONE_EXAM.description}</p>

                                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-2xl font-bold text-slate-900 dark:text-white">{SELF_TARIFFS.ONE_EXAM.price.toLocaleString()}</span>
                                        <span className="text-xs text-slate-400">so'm</span>
                                    </div>
                                    <button
                                        onClick={() => handleBuyPlan(SELF_TARIFFS.ONE_EXAM.id)}
                                        disabled={purchasing}
                                        className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-3 rounded-xl font-bold text-sm transition-colors"
                                    >
                                        Sotib Olish
                                    </button>
                                </div>
                            </div>

                            {/* 5 Exams - Best Value (Visual Emphasis) */}
                            <div className="relative bg-gradient-to-b from-cyan-900 to-slate-900 border border-cyan-500/50 p-6 rounded-3xl flex flex-col shadow-2xl shadow-cyan-900/20 transform md:-translate-y-2">
                                <div className="absolute top-0 right-0 bg-cyan-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">ENG KO'P SOTILADIGAN</div>
                                <h4 className="font-bold text-lg text-white mb-2">{SELF_TARIFFS.FIVE_EXAMS.title}</h4>
                                <p className="text-xs text-cyan-100/70 mb-6 flex-1">{SELF_TARIFFS.FIVE_EXAMS.description}</p>
                                
                                {/* SCARCITY TRIGGER */}
                                <div className="text-[10px] text-red-400 font-bold mb-2 animate-pulse">🔥 Only 3 packs left at this price</div>

                                <div className="border-t border-white/10 pt-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <span className="text-xs text-slate-400 line-through mr-2">45,000</span>
                                            <span className="text-3xl font-bold text-white">{SELF_TARIFFS.FIVE_EXAMS.price.toLocaleString()}</span>
                                        </div>
                                        <span className="text-xs text-cyan-200">so'm</span>
                                    </div>
                                    <button
                                        onClick={() => handleBuyPlan(SELF_TARIFFS.FIVE_EXAMS.id)}
                                        disabled={purchasing}
                                        className="w-full bg-cyan-500 hover:bg-cyan-400 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/30 transition-colors"
                                    >
                                        Paketni Olish
                                    </button>
                                </div>
                            </div>

                            {/* PRO - Subscription */}
                            <div className="bg-white dark:bg-slate-900 border border-yellow-500/30 p-6 rounded-3xl flex flex-col relative overflow-hidden group hover:border-yellow-500/60 transition-all">
                                <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{SELF_TARIFFS.PRO_SUBSCRIPTION.title}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 flex-1">
                                    {SELF_TARIFFS.PRO_SUBSCRIPTION.description}
                                </p>

                                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-2xl font-bold text-slate-900 dark:text-white">{SELF_TARIFFS.PRO_SUBSCRIPTION.price.toLocaleString()}</span>
                                        <span className="text-xs text-slate-400">so'm / oy</span>
                                    </div>
                                    <button
                                        onClick={() => handleBuyPlan(SELF_TARIFFS.PRO_SUBSCRIPTION.id)}
                                        disabled={purchasing}
                                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 transition-colors"
                                    >
                                        Obuna Bo'lish
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PERSONAL PLAN SECTION - Interactive Placeholder */}
                {lastExam && !lastExam.isLocked && (
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Shaxsiy Reja (AI Powered)</h3>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                            {lastExam.dailyPlan ? (
                                <div className="space-y-4">
                                    {lastExam.dailyPlan.slice(0, 3).map((plan: any, i: number) => (
                                        <div key={i} className="flex gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors cursor-pointer group">
                                            <div className="w-6 h-6 mt-1 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center group-hover:bg-cyan-500 group-hover:border-cyan-500 transition-colors">
                                                {/* Checkbox simulation */}
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500 font-bold uppercase mb-1">{plan.day} - {plan.focusArea}</div>
                                                <div className="text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed group-hover:line-through transition-all opacity-100 group-hover:opacity-50">{plan.activity}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <div className="text-slate-500 text-sm">Test ishlasangiz, reja tuzib beramiz.</div>}
                        </div>
                    </div>
                )}

                {showPayment && (
                    <PaymentModal user={user} onClose={() => setShowPayment(false)} />
                )}

                {/* NO CREDITS MODAL FOR B2B */}
                {showStudentModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-sm text-center shadow-2xl">
                            <div className="w-16 h-16 bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Imtihon qolmadi</h3>
                            <p className="text-slate-400 text-sm mb-6">
                                Sizda faol imtihonlar mavjud emas. Iltimos, davom ettirish uchun o'qituvchingizga murojaat qiling.
                            </p>
                            <button onClick={() => setShowStudentModal(false)} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold">Tushunarli</button>
                        </div>
                    </div>
                )}

                {/* SETTINGS / CHANGE PASSWORD MODAL */}
                {showSettings && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="glass-card bg-white dark:bg-slate-900 w-full max-w-md p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Profil Sozlamalari</h3>
                                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">✕</button>
                            </div>
                            
                            <div className="mb-6">
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Foydalanuvchi</p>
                                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                                        {user.firstName[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{user.firstName} {user.lastName}</div>
                                        <div className="text-xs text-slate-500">{user.email}</div>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleUpdatePassword}>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Yangi Parol</label>
                                <input 
                                    type="password" 
                                    required
                                    placeholder="Yangi parol kiriting..." 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all mb-6"
                                />
                                <button 
                                    type="submit" 
                                    disabled={isSavingPass}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                                >
                                    {isSavingPass ? 'Saqlanmoqda...' : 'Parolni Yangilash'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
