
import React, { useEffect, useState } from 'react';
import { UserProfile, TeacherStudent } from '../types';
import PaymentModal from './PaymentModal';
import { logoutUser, saveUser } from '../utils/storageUtils';
import { TEACHER_TARIFFS } from '../config/teacherTariffs';
import { API_BASE_URL } from '../utils/api';

interface TeacherDashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user: initialUser, onLogout }) => {
  const [user, setUser] = useState(initialUser);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<TeacherStudent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showEditModal, setShowEditModal] = useState<TeacherStudent | null>(null); // For password reset
  const [showHomeworkModal, setShowHomeworkModal] = useState<TeacherStudent | null>(null); // For assigning homework
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // Loading States
  const [purchasing, setPurchasing] = useState(false);
  const [distributing, setDistributing] = useState<string | null>(null); // student ID being processed
  const [assigningHomework, setAssigningHomework] = useState(false);

  // Create Student Form
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', email: '', password: '' });
  // Edit Student Form
  const [editForm, setEditForm] = useState({ password: '' });
  // Homework Form
  const [homeworkText, setHomeworkText] = useState('');

  // REFRESH DATA
  useEffect(() => {
    const refreshData = async () => {
         try {
             // 1. Refresh User (Balance/Credits)
             const uRes = await fetch(`${API_BASE_URL}/api/user/${initialUser.email}`);
             if(uRes.ok) {
                 const uData = await uRes.json();
                 setUser(uData);
                 saveUser(uData);
             }
             // 2. Refresh Students
             const sRes = await fetch(`${API_BASE_URL}/api/teacher/students?teacherId=${initialUser._id || initialUser.id}`);
             if (sRes.ok) {
                 const sData = await sRes.json();
                 setStudents(sData);
                 setFilteredStudents(sData);
             }
         } catch(e) {}
    };
    refreshData();
  }, [initialUser.id]);

  useEffect(() => {
    const lowerQ = searchQuery.toLowerCase();
    const filtered = students.filter(s => 
        s.firstName.toLowerCase().includes(lowerQ) || 
        s.lastName.toLowerCase().includes(lowerQ) ||
        s.email.toLowerCase().includes(lowerQ)
    );
    setFilteredStudents(filtered);
  }, [searchQuery, students]);

  // ACTIONS

  const handleAddStudent = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const res = await fetch(`${API_BASE_URL}/api/teacher/create-student`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...newStudent, teacherId: user._id || user.id })
          });
          const data = await res.json();
          if (res.ok) {
              alert("O'quvchi muvaffaqiyatli qo'shildi!");
              setShowAddModal(false);
              setNewStudent({ firstName: '', lastName: '', email: '', password: '' });
              // Refresh List
              const sRes = await fetch(`${API_BASE_URL}/api/teacher/students?teacherId=${user._id || user.id}`);
              const sData = await sRes.json();
              setStudents(sData);
          } else {
              alert(data.message);
          }
      } catch (e) { alert("Xatolik"); }
  };

  const handleBuyPackage = async (tariff: any) => {
      if (user.balance < tariff.price) {
          if(window.confirm(`Balansingiz yetarli emas. Hamyonni to'ldirishni xohlaysizmi?`)) {
              setShowPayment(true);
          }
          return;
      }

      if (!window.confirm(`Hamyondan ${tariff.price.toLocaleString()} so'm yechiladi. "${tariff.title}" paketini olasizmi?`)) return;

      setPurchasing(true);
      try {
          const res = await fetch(`${API_BASE_URL}/api/wallet/purchase-plan`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user._id || user.id, planId: tariff.id })
          });
          const data = await res.json();
          if (res.ok) {
              alert("Muvaffaqiyatli xarid qilindi! Kreditlar qo'shildi.");
              setUser(data.user);
              saveUser(data.user);
          } else {
              alert(data.message);
          }
      } catch (e) { alert("Xatolik"); }
      finally { setPurchasing(false); }
  };

  const handleDistributeCredit = async (studentId: string) => {
      if ((user.examsLeft || 0) <= 0 && user.subscriptionPlan !== 'unlimited_teacher') {
          alert("Sizda kreditlar qolmagan. Iltimos, paket sotib oling.");
          return;
      }
      
      setDistributing(studentId);
      try {
          const res = await fetch(`${API_BASE_URL}/api/teacher/distribute-credit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ teacherId: user._id || user.id, studentId })
          });
          const data = await res.json();
          if (res.ok) {
              // Local update for immediate UI feedback
              setUser(prev => ({ ...prev, examsLeft: data.teacherRemaining }));
              setStudents(prev => prev.map(s => s._id === studentId ? { ...s, examsLeft: data.studentCredits } : s));
          } else {
              alert(data.message);
          }
      } catch (e) { alert("Xatolik"); }
      finally { setDistributing(null); }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!showEditModal || !editForm.password) return;
      try {
          const res = await fetch(`${API_BASE_URL}/api/admin/change-password`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: showEditModal._id, newPassword: editForm.password })
          });
          if (res.ok) {
              alert("Parol o'zgartirildi!");
              setShowEditModal(null);
              setEditForm({ password: '' });
          } else {
              alert("Xatolik");
          }
      } catch (e) { alert("Server xatosi"); }
  };

  const handleAssignHomework = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!showHomeworkModal || !homeworkText.trim()) return;

      setAssigningHomework(true);
      try {
          const res = await fetch(`${API_BASE_URL}/api/teacher/assign-homework`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  studentId: showHomeworkModal._id,
                  text: homeworkText
              })
          });
          const data = await res.json();
          if (res.ok) {
              alert("Vazifa muvaffaqiyatli yuborildi!");
              setShowHomeworkModal(null);
              setHomeworkText('');
          } else {
              alert(data.message || "Xatolik yuz berdi");
          }
      } catch (e) {
          alert("Server bilan aloqa yo'q");
      } finally {
          setAssigningHomework(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans text-slate-200">
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 pb-6 border-b border-slate-800 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="bg-gradient-to-r from-cyan-600 to-blue-600 p-2 rounded-lg">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        </span>
                        SpeakPro CRM
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">{user.firstName} {user.lastName} | <span className="text-cyan-400">Admin Access</span></p>
                </div>
                <div className="flex gap-4 items-center w-full md:w-auto">
                    {/* CREDITS DISPLAY */}
                    <div className="bg-slate-900 border border-slate-700 px-5 py-2.5 rounded-xl text-center">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Mavjud Kreditlar</div>
                        <div className="text-xl font-bold text-white font-mono">
                            {user.subscriptionPlan === 'unlimited_teacher' ? '∞' : (user.examsLeft || 0)} <span className="text-xs text-slate-500">ta</span>
                        </div>
                    </div>

                    {/* WALLET */}
                    <div 
                        onClick={() => setShowPayment(true)}
                        className="bg-slate-900 border border-slate-700 hover:border-green-500 cursor-pointer px-5 py-2.5 rounded-xl transition-all group text-center"
                    >
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Hamyon (UZS)</div>
                        <div className="text-xl font-bold text-white font-mono group-hover:text-green-400">{(user.balance || 0).toLocaleString()}</div>
                    </div>

                    <button onClick={() => { logoutUser(); onLogout(); }} className="px-4 py-2 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm">Chiqish</button>
                </div>
            </header>

            {/* PRICING STORE (Credit Bank) */}
            <div className="mb-10 animate-fade-in-up">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    Kreditlar Do'koni (Paketlar)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.values(TEACHER_TARIFFS).map((plan) => (
                        <div key={plan.id} className={`bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-cyan-500/50 transition-all ${plan.isPopular ? 'ring-2 ring-cyan-500' : ''}`}>
                            {plan.isPopular && <div className="absolute top-0 right-0 bg-cyan-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">POPULAR</div>}
                            
                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-white">{plan.title}</h3>
                                <p className="text-xs text-slate-500 h-8">{plan.description}</p>
                            </div>

                            <div className="mb-4 flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-white">{plan.credits}</span>
                                <span className="text-sm text-slate-400">ta imtihon</span>
                            </div>

                            <div className="bg-slate-950 rounded-lg p-3 mb-4 border border-slate-800">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-500">Narxi:</span>
                                    <span className="text-white font-mono">{plan.price.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Donasi:</span>
                                    <span className="text-green-400 font-mono font-bold">{plan.costPerExam > 0 ? plan.costPerExam.toLocaleString() : '0'} so'm</span>
                                </div>
                                <div className="mt-2 text-[10px] text-yellow-500 text-right font-bold">
                                    Foyda: {plan.savings}
                                </div>
                            </div>

                            <button 
                                onClick={() => handleBuyPackage(plan)}
                                disabled={purchasing}
                                className={`w-full py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r ${plan.color} hover:opacity-90 shadow-lg`}
                            >
                                Sotib Olish
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* STUDENT MANAGEMENT */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                 <div className="relative w-full md:w-96">
                     <svg className="absolute left-3 top-3 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                     <input 
                        type="text" 
                        placeholder="O'quvchini qidirish..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-4 py-2.5 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                     />
                 </div>
                 <button 
                    onClick={() => setShowAddModal(true)}
                    className="w-full md:w-auto bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                 >
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                     Yangi O'quvchi
                 </button>
            </div>

            <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-slate-400 text-xs uppercase font-semibold">
                        <tr>
                            <th className="p-5">O'quvchi</th>
                            <th className="p-5">Holat</th>
                            <th className="p-5">Oxirgi Natija</th>
                            <th className="p-5 text-right">Amallar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-sm">
                        {filteredStudents.map(s => (
                           <React.Fragment key={s._id}>
                            <tr className="hover:bg-slate-800/40 transition-colors group">
                                <td className="p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-cyan-500 font-bold border border-slate-700">
                                            {s.firstName[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-base">{s.firstName} {s.lastName}</div>
                                            <div className="text-slate-500 text-xs font-mono">{s.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <div className="flex items-center gap-2">
                                        {/* Exam Credit Badge */}
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${ (s.examsLeft || 0) > 0 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20' }`}>
                                            <span>{s.examsLeft || 0} ta kredit</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5">
                                    {s.lastExam ? (
                                        <div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold text-white">{s.lastExam.overallBand}</span>
                                                <span className="text-xs text-slate-500">BAND</span>
                                            </div>
                                            <div className="text-xs text-slate-500">{new Date(s.lastExam.date).toLocaleDateString()}</div>
                                        </div>
                                    ) : (
                                        <span className="text-slate-600 italic">Topshirmagan</span>
                                    )}
                                </td>
                                <td className="p-5 text-right">
                                    <div className="flex justify-end gap-2 items-center">
                                        
                                        {/* VIEW DETAILS */}
                                        <button 
                                            onClick={() => setExpandedRow(expandedRow === s._id ? null : s._id)}
                                            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                                            title="Natijalarni ko'rish"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                        </button>
                                        
                                        {/* EDIT PASSWORD */}
                                        <button 
                                            onClick={() => { setShowEditModal(s); setEditForm({password: ''}); }}
                                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                            title="Parolni o'zgartirish"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>

                                        {/* NEW: ASSIGN HOMEWORK */}
                                        <button 
                                            onClick={() => { setShowHomeworkModal(s); setHomeworkText(''); }}
                                            className="p-2 text-indigo-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                            title="Vazifa berish"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                        </button>

                                        {/* GIVE CREDIT BUTTON */}
                                        <button 
                                            onClick={() => handleDistributeCredit(s._id)}
                                            disabled={distributing === s._id}
                                            className="ml-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            {distributing === s._id ? '...' : 'Imtihon (+1)'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            
                            {/* EXPANDED DETAILS (Fixed Score Mapping) */}
                            {expandedRow === s._id && s.lastExam && (
                                <tr className="bg-slate-900/30 shadow-inner animate-fade-in-up">
                                    <td colSpan={5} className="p-6">
                                        <div className="grid md:grid-cols-2 gap-8">
                                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider">Detailed Scores</h4>
                                                <div className="grid grid-cols-4 gap-3">
                                                    {[
                                                        // FIX: Map directly to flattened Mongoose response keys
                                                        { l: 'Fluency', v: (s.lastExam as any).fluencyScore || (s.lastExam.scores?.f), c: 'text-green-400' },
                                                        { l: 'Lexical', v: (s.lastExam as any).lexicalScore || (s.lastExam.scores?.l), c: 'text-yellow-400' },
                                                        { l: 'Grammar', v: (s.lastExam as any).grammarScore || (s.lastExam.scores?.g), c: 'text-blue-400' },
                                                        { l: 'Pronun.', v: (s.lastExam as any).pronunciationScore || (s.lastExam.scores?.p), c: 'text-purple-400' }
                                                    ].map((score, idx) => (
                                                        <div key={idx} className="text-center p-2 bg-slate-950 rounded-lg">
                                                            <div className="text-[10px] text-slate-500 mb-1">{score.l}</div>
                                                            <div className={`text-xl font-bold ${score.c}`}>{score.v}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider">Analysis</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {(s.lastExam.weaknessTags || s.lastExam.weaknesses)?.map((tag: string, i: number) => (
                                                        <span key={i} className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded text-xs font-medium">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {(!(s.lastExam.weaknessTags || s.lastExam.weaknesses) || (s.lastExam.weaknessTags || s.lastExam.weaknesses).length === 0) && (
                                                        <span className="text-slate-500 text-sm italic">No specific weaknesses tagged.</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                           </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Add Student Modal */}
        {showAddModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-sm shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-6">Yangi O'quvchi</h3>
                    <form onSubmit={handleAddStudent} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 ml-1">Ism</label>
                            <input required value={newStudent.firstName} onChange={e => setNewStudent({...newStudent, firstName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none transition-colors" placeholder="John" />
                        </div>
                        <div className="space-y-1">
                             <label className="text-xs text-slate-500 ml-1">Familiya</label>
                             <input required value={newStudent.lastName} onChange={e => setNewStudent({...newStudent, lastName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none transition-colors" placeholder="Doe" />
                        </div>
                        <div className="space-y-1">
                             <label className="text-xs text-slate-500 ml-1">Email (Login)</label>
                             <input required type="email" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none transition-colors" placeholder="student@example.com" />
                        </div>
                        <div className="space-y-1">
                             <label className="text-xs text-slate-500 ml-1">Vaqtinchalik Parol</label>
                             <input required type="text" value={newStudent.password} onChange={e => setNewStudent({...newStudent, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none transition-colors" placeholder="pass123" />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-slate-400 hover:text-white bg-slate-800 rounded-lg font-medium">Bekor qilish</button>
                            <button type="submit" className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold shadow-lg shadow-cyan-500/20">Qo'shish</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Edit Password Modal */}
        {showEditModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-sm shadow-2xl">
                    <h3 className="text-lg font-bold text-white mb-2">Parolni tiklash</h3>
                    <p className="text-sm text-slate-400 mb-6">{showEditModal.firstName} {showEditModal.lastName} uchun yangi parol o'rnating.</p>
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <input required type="text" placeholder="Yangi parol..." value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" />
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowEditModal(null)} className="flex-1 py-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg">Yopish</button>
                            <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold">Saqlash</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Homework Modal */}
        {showHomeworkModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl animate-fade-in-up">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-white">Vazifa Biriktirish</h3>
                            <p className="text-sm text-slate-400">O'quvchi: {showHomeworkModal.firstName} {showHomeworkModal.lastName}</p>
                        </div>
                        <button onClick={() => setShowHomeworkModal(null)} className="text-slate-500 hover:text-white">✕</button>
                    </div>
                    
                    <form onSubmit={handleAssignHomework} className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-500 block mb-2">Vazifa matni</label>
                            <textarea 
                                required 
                                rows={6}
                                placeholder="Masalan: Part 2 mavzularini takrorlash va 3 ta topic yozib kelish..." 
                                value={homeworkText} 
                                onChange={e => setHomeworkText(e.target.value)} 
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-indigo-500 outline-none resize-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowHomeworkModal(null)} className="flex-1 py-3 text-slate-400 hover:text-white bg-slate-800 rounded-lg font-medium">Bekor qilish</button>
                            <button type="submit" disabled={assigningHomework} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                {assigningHomework ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Yuklanmoqda...
                                    </>
                                ) : 'Yuborish'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {showPayment && (
            <PaymentModal user={user} onClose={() => setShowPayment(false)} />
        )}
    </div>
  );
};

export default TeacherDashboard;
