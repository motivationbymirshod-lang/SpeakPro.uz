
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { saveUser } from '../utils/storageUtils';
import { trackEvent } from '../utils/analytics';

// Global google type definition
declare global {
    interface Window {
        google: any;
    }
}

interface AuthProps {
  onLogin: (user: UserProfile) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false); // B2B Toggle
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  
  // FIXED: Read from .env file (Vite standard) or fallback to placeholder
  // NOTE: Use (import.meta as any) to avoid TS errors if types aren't set up
  const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    currentLevel: '', 
    targetLevel: ''  
  });

  // INITIALIZE GOOGLE BUTTON
  useEffect(() => {
    // Function to render button
    const renderGoogleButton = () => {
        if (window.google && window.google.accounts) {
            try {
                // Initialize
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleCallback,
                    auto_select: false
                });
                
                // Render
                const btn = document.getElementById('google-btn-wrapper');
                if (btn) {
                    // Clear previous content to avoid duplicates
                    btn.innerHTML = '';
                    
                    window.google.accounts.id.renderButton(btn, {
                        theme: 'filled_blue',
                        size: 'large',
                        type: 'standard',
                        // Note: Google Sign-In button width does NOT support '100%'. 
                        // It must be a pixel value (integer or string) or left undefined.
                        // We leave it undefined or set a specific pixel width if needed.
                        text: isLogin ? 'signin_with' : 'signup_with',
                        logo_alignment: 'left',
                        width: '350' // Optional: forcing a wide button (max is usually around 400px)
                    });
                }
            } catch (e) {
                console.error("Google Auth Init Error:", e);
            }
            return true;
        }
        return false;
    };

    // Attempt to render immediately
    if (!renderGoogleButton()) {
        // If script not loaded yet, poll for it
        const intervalId = setInterval(() => {
            if (renderGoogleButton()) {
                clearInterval(intervalId);
            }
        }, 300);
        return () => clearInterval(intervalId);
    }
  }, [isLogin]); 

  // Callback from Google
  const handleGoogleCallback = async (response: any) => {
      const token = response.credential;
      setLoading(true);
      setError('');
      
      try {
          const res = await fetch('http://localhost:5000/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token })
          });
          
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Google Login Failed");
          
          saveUser(data);
          // ANALYTICS: Track Google Login/Signup
          trackEvent(isLogin ? 'login' : 'sign_up', { method: 'google', email: data.email });
          
          onLogin(data);
      } catch (e: any) {
          setError(e.message || "Google bilan ulanishda xatolik.");
      } finally {
          setLoading(false);
      }
  };

  // Validation Regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+998\d{9}$/;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateForm = () => {
    if (!emailRegex.test(formData.email)) {
        return "Iltimos, haqiqiy email manzil kiriting (masalan: user@gmail.com)";
    }
    if (!isLogin && !phoneRegex.test(formData.phone)) {
        return "Telefon raqam noto'g'ri formatda. Namuna: +998901234567";
    }
    if (!formData.password || formData.password.length < 6) {
        return "Parol kamida 6 ta belgidan iborat bo'lishi kerak.";
    }
    if (!isLogin && !isTeacher) {
        if (!formData.currentLevel) return "Iltimos, hozirgi darajangizni tanlang.";
        if (!formData.targetLevel) return "Iltimos, maqsad qilgan darajangizni tanlang.";
    }
    return null;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          const res = await fetch('http://localhost:5000/api/forgot-password', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ email: forgotEmail })
          });
          const data = await res.json();
          if (data.success) {
              setSuccessMsg(data.message);
          } else {
              setError("Xatolik yuz berdi");
          }
      } catch (e) {
          setError("Server bilan aloqa yo'q");
      } finally {
          setLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
        setError(validationError);
        return;
    }

    setLoading(true);

    const API_URL = 'http://localhost:5000/api'; 

    try {
        if (isLogin) {
            // LOGIN
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            }).catch(() => { throw new Error("Server ishlamayapti. Mahalliy rejimda ishlayapsizmi?"); });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Xatolik yuz berdi");

            saveUser(data); 
            trackEvent('login', { method: 'email', email: data.email });
            
            onLogin(data);

        } else {
            // SIGNUP
            const body = {
                ...formData,
                role: isTeacher ? 'teacher' : 'student'
            };

            const response = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }).catch(() => { throw new Error("Server ishlamayapti."); });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Xatolik yuz berdi");

            saveUser(data);
            trackEvent('sign_up', { 
                method: 'email', 
                email: data.email,
                role: isTeacher ? 'teacher' : 'student'
            });
            
            onLogin(data);
        }
    } catch (err: any) {
        setError(err.message || "Tizim xatoligi.");
    } finally {
        setLoading(false);
    }
  };

  // FORGOT PASSWORD MODAL
  if (showForgot) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm fixed inset-0 z-50">
            <div className="glass-card w-full max-w-md p-8 rounded-2xl shadow-2xl border border-slate-700/50 bg-white dark:bg-slate-900">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Parolni tiklash</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Akkauntga ulangan email manzilingizni kiriting. Biz sizga vaqtinchalik parol yuboramiz (1 soat amal qiladi).</p>
                
                {successMsg ? (
                    <div className="bg-green-500/20 text-green-600 dark:text-green-400 p-4 rounded-lg mb-4 border border-green-500/50 text-center">
                        {successMsg}
                    </div>
                ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                        <input 
                            type="email" 
                            required 
                            placeholder="Email..." 
                            value={forgotEmail} 
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:border-cyan-500 outline-none"
                        />
                        <button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg">
                            {loading ? 'Yuborilmoqda...' : 'Parol yuborish'}
                        </button>
                    </form>
                )}
                <button onClick={() => { setShowForgot(false); setSuccessMsg(''); }} className="mt-4 text-slate-500 text-sm hover:text-slate-900 dark:hover:text-white w-full text-center">Orqaga qaytish</button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="glass-card w-full max-w-lg p-8 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/50 relative z-10 bg-white/70 dark:bg-slate-900/70">
        <div className="text-center mb-8">
           <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 mb-4 shadow-[0_0_15px_rgba(0,243,255,0.3)] animate-glow">
             {/* UPDATED LOGO: MICROPHONE (Matches Landing Page) */}
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
             </svg>
           </div>
           <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Speak<span className="text-cyan-600 dark:text-cyan-400">Pro</span></h1>
           <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm uppercase tracking-widest">Speak like a Pro!</p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg mb-6 border border-slate-200 dark:border-slate-800">
            <button 
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-300 ${isLogin ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-lg ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
            >
                KIRISH
            </button>
            <button 
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all duration-300 ${!isLogin ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-lg ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
            >
                RO'YXATDAN O'TISH
            </button>
        </div>

        {/* GOOGLE BUTTON CONTAINER */}
        <div className="w-full mb-4 flex justify-center">
            {/* Wrapper width fixed to prevent layout shift */}
            <div id="google-btn-wrapper" className="min-h-[40px] w-[350px] flex justify-center overflow-hidden"></div>
        </div>

        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">YOKI EMAIL ORQALI</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
           {!isLogin && (
               <>
                 {/* FREE EXAM PROMO BANNER */}
                 <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold p-3 rounded-lg text-center animate-pulse">
                     🎁 Hoziroq ro'yxatdan o'ting va 1 ta BEPUL imtihon oling!
                 </div>

                 {/* B2B Toggle */}
                 <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-2">
                     <div 
                        onClick={() => setIsTeacher(!isTeacher)}
                        className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${isTeacher ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                     >
                         <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isTeacher ? 'translate-x-4' : ''}`}></div>
                     </div>
                     <span className="text-sm text-slate-700 dark:text-slate-300 font-medium cursor-pointer" onClick={() => setIsTeacher(!isTeacher)}>
                         O'quv markaziman / O'qituvchiman (B2B)
                     </span>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="group">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400 transition-colors">
                            {isTeacher ? "Markaz Nomi" : "Ism"}
                        </label>
                        <input required type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600" placeholder="John" />
                    </div>
                    <div className="group">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400 transition-colors">
                            {isTeacher ? "Mas'ul Shaxs" : "Familiya"}
                        </label>
                        <input required type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600" placeholder="Doe" />
                    </div>
                 </div>
                 <div className="group">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400 transition-colors">Telefon (+998...)</label>
                    <input 
                        required 
                        type="tel" 
                        name="phone" 
                        value={formData.phone} 
                        onChange={handleChange} 
                        className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600 font-mono" 
                        placeholder="+998901234567" 
                    />
                 </div>
               </>
           )}

           <div className="group">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400 transition-colors">Email</label>
              <input 
                required 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600" 
                placeholder="name@example.com" 
              />
           </div>

           <div className="group">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400 transition-colors">Parol</label>
              <input required type="password" name="password" value={formData.password} onChange={handleChange} className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600" placeholder="••••••••" />
           </div>

           {isLogin && (
               <div className="text-right">
                   <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                       Parolni unutdingizmi?
                   </button>
               </div>
           )}

           {!isLogin && !isTeacher && (
               <div className="grid grid-cols-2 gap-4 pt-2">
                 <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hozirgi daraja</label>
                    <select required name="currentLevel" value={formData.currentLevel} onChange={handleChange} className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white outline-none cursor-pointer">
                      <option value="" disabled>Tanlang...</option>
                      {['4.0','5.0','5.5','6.0','6.5','7.0','7.5','8.0'].map(l => <option key={l} value={l} className="bg-white dark:bg-slate-900">{l}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Maqsad</label>
                    <select required name="targetLevel" value={formData.targetLevel} onChange={handleChange} className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white outline-none cursor-pointer">
                       <option value="" disabled>Tanlang...</option>
                       {['5.0','6.0','6.5','7.0','7.5','8.0','8.5','9.0'].map(l => <option key={l} value={l} className="bg-white dark:bg-slate-900">{l}</option>)}
                    </select>
                 </div>
               </div>
           )}

           {error && (
             <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/50 rounded-lg p-3 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
             </div>
           )}

           <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 rounded-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] mt-4 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed group">
             <span className="relative z-10 flex items-center justify-center gap-2">
                 {loading ? (
                    <>
                       <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                       Yuklanmoqda...
                    </>
                 ) : (
                    <>
                       {isLogin ? 'TIZIMGA KIRISH' : (isTeacher ? 'MARKAZ OCHISH' : 'TEKIN START')}
                       <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </>
                 )}
             </span>
           </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
