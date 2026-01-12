
import React, { useState, useEffect } from 'react';
import { UserProfile, AppState, ExamResult } from './types';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ExamRoom from './components/ExamRoom';
import Results from './components/Results';
import AdminPanel from './components/AdminPanel';
import TeacherDashboard from './components/TeacherDashboard'; // Import new B2B Dashboard
import FeedbackWidget from './components/FeedbackWidget'; // NEW WIDGET
import Landing from './components/Landing'; // NEW LANDING
import { generateExamFeedback } from './services/aiService';
import { getCurrentUser, saveUser } from './utils/storageUtils';
import { trackEvent } from './utils/analytics';

function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.LANDING);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [examTopicMode, setExamTopicMode] = useState<'random' | 'forecast'>('random'); // NEW: Topic Mode

  // THEME STATE
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');

  // Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (t: string) => {
      if (t === 'dark') {
        root.classList.add('dark');
      } else if (t === 'light') {
        root.classList.remove('dark');
      } else {
        // System
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') applyTheme('system');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  useEffect(() => {
    const savedUser = getCurrentUser();
    if (savedUser) {
      if (savedUser.role === 'admin' || savedUser.email === 'Motivationbymirshod@gmail.com') {
        setUser(savedUser);
        setAppState(AppState.ADMIN);
      } else {
        setUser(savedUser);
        setAppState(AppState.DASHBOARD);
      }
    }
  }, []);

  const handleLogin = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    saveUser(loggedInUser);
    if (loggedInUser.role === 'admin' || loggedInUser.email === 'Motivationbymirshod@gmail.com') {
      setAppState(AppState.ADMIN);
    } else {
      setAppState(AppState.DASHBOARD);
    }
  };

  const refreshUserData = async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(`https://speakpro-uz.onrender.com/api/user/${user.email}`);
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        saveUser(updatedUser);
      }
    } catch (e) {
      console.error("Failed to sync user data", e);
    }
  };

  // UPDATED: Accepts topic mode
  const startExam = async (mode: 'random' | 'forecast' = 'random') => {
    if(!user) return;
    
    try {
        const res = await fetch('https://speakpro-uz.onrender.com/api/exam/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user._id || user.id })
        });
        const data = await res.json();
        
        if (res.ok) {
            const updatedUser = { ...user, examsLeft: data.examsLeft };
            setUser(updatedUser);
            saveUser(updatedUser);
            
            setExamTopicMode(mode); // Set the mode
            trackEvent('exam_start', { email: user?.email, mode: mode });
            setAppState(AppState.EXAM);
        } else {
            alert(data.message || "Xatolik yuz berdi. Imtihon boshlanmadi.");
        }
    } catch (e) {
        alert("Server bilan aloqa yo'q. Internetni tekshiring.");
    }
  };

  const finishExam = async (transcript: string) => {
    setAppState(AppState.RESULTS);
    setIsLoadingResults(true);

    trackEvent('exam_complete', {
      email: user?.email,
      transcript_length: transcript.length
    });

    const processedTranscript = transcript.length > 20
      ? transcript
      : "The candidate said very little. The connection might have been unstable or the candidate was silent.";

    try {
      const result = await generateExamFeedback(processedTranscript, user?.targetLevel || '7.0');
      setExamResult(result);

      if (user && user.email) {
        await fetch('https://speakpro-uz.onrender.com/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, result })
        });
        await refreshUserData();
      }

    } catch (e) {
      console.error("Result generation failed", e);
      alert("Analysis failed. Please try again.");
      setAppState(AppState.DASHBOARD);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const restart = () => {
    setExamResult(null);
    setAppState(AppState.DASHBOARD);
    refreshUserData();
  };

  const handleLogout = () => {
    setUser(null);
    setAppState(AppState.LANDING);
  };

  const getThemeIcon = () => {
    if (theme === 'light') return (
      <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    );
    if (theme === 'dark') return (
      <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
    );
    return (
      <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
    );
  };

  return (
    <div className="font-sans">
      {appState === AppState.LANDING && (
        <Landing onStart={() => setAppState(AppState.AUTH)} />
      )}

      {appState === AppState.AUTH && (
        <Auth onLogin={handleLogin} />
      )}

      {appState === AppState.ADMIN && (
        <AdminPanel onLogout={handleLogout} />
      )}

      {appState === AppState.DASHBOARD && user && (
        user.role === 'teacher' ? (
          <TeacherDashboard user={user} onLogout={handleLogout} />
        ) : (
          <Dashboard
            user={user}
            onStartExam={(mode) => startExam(mode)} 
            onLogout={handleLogout}
          />
        )
      )}

      {/* UPDATED: Pass topicMode */}
      {appState === AppState.EXAM && user && (
        <ExamRoom user={user} onFinish={finishExam} topicMode={examTopicMode} />
      )}

      {appState === AppState.RESULTS && (
        <div className="min-h-screen bg-white dark:bg-slate-950 p-6 flex flex-col justify-center transition-colors duration-300">
          {isLoadingResults ? (
            <div className="flex flex-col items-center justify-center h-[80vh]">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-t-4 border-cyan-500 border-solid rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-b-4 border-purple-500 border-solid rounded-full animate-spin reverse"></div>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-8 tracking-wider animate-pulse">GENERATING REPORT</p>
              <p className="text-sm text-cyan-600 dark:text-cyan-500/60 mt-2 font-mono">Comparing against Band {user?.targetLevel || '7.0'} standards...</p>
            </div>
          ) : (
            <Results result={examResult} onRestart={restart} />
          )}
        </div>
      )}

      {user && appState !== AppState.ADMIN && appState !== AppState.AUTH && appState !== AppState.LANDING && (
        <FeedbackWidget user={user} />
      )}

      <button
        onClick={toggleTheme}
        className="fixed bottom-4 left-4 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
        title={`Current: ${theme.toUpperCase()}`}
      >
        {getThemeIcon()}
      </button>

    </div>
  );
}

export default App;
