
import React, { useEffect, useState } from 'react';
import { logoutUser } from '../utils/storageUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { FeedbackItem, PaymentRequest } from '../types';

interface AdminPanelProps {
    onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState<'payments' | 'users' | 'analytics' | 'feedbacks'>('payments');

    // Data States
    const [users, setUsers] = useState<any[]>([]);
    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
    const [payments, setPayments] = useState<PaymentRequest[]>([]);
    const [statsData, setStatsData] = useState<any>(null);

    // Pagination & Loading
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);

    // Modals State
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [walletModalUser, setWalletModalUser] = useState<any | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState<any | null>(null);

    // Form States
    const [addAmount, setAddAmount] = useState('');
    const [setPlan, setSetPlan] = useState('free');
    const [setExamCount, setSetExamCount] = useState('');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        if (activeTab === 'users') fetchUsers(page);
        if (activeTab === 'analytics') fetchStats();
        if (activeTab === 'feedbacks') fetchFeedbacks();
        if (activeTab === 'payments') fetchPayments();
    }, [activeTab, page]);

    // --- API CALLS ---

    const fetchUsers = (pageNum: number) => {
        setLoading(true);
        fetch(`https://speakpro-uz.onrender.com/api/admin/users?page=${pageNum}&limit=10`)
            .then(res => res.json())
            .then(data => {
                setUsers(data.users);
                setTotalPages(data.totalPages);
                setLoading(false);
            })
            .catch(e => { console.error(e); setLoading(false); });
    };

    const fetchPayments = () => {
        setLoading(true);
        fetch(`https://speakpro-uz.onrender.com/api/admin/payments`)
            .then(res => res.json())
            .then(data => {
                setPayments(data);
                setLoading(false);
            })
            .catch(e => setLoading(false));
    };

    const fetchStats = () => {
        setLoading(true);
        fetch('https://speakpro-uz.onrender.com/api/admin/stats')
            .then(res => res.json())
            .then(data => {
                setStatsData(data);
                setLoading(false);
            })
            .catch(console.error);
    };

    const fetchFeedbacks = () => {
        setLoading(true);
        fetch('https://speakpro-uz.onrender.com/api/admin/feedbacks')
            .then(res => res.json())
            .then(data => {
                setFeedbacks(data);
                setLoading(false);
            })
            .catch(e => setLoading(false));
    };

    // --- ACTIONS ---

    const approvePayment = async (requestId: string) => {
        if (!window.confirm("To'lovni tasdiqlaysizmi? User balansiga pul tushadi.")) return;
        try {
            const res = await fetch('https://speakpro-uz.onrender.com/api/admin/approve-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId })
            });
            if (res.ok) fetchPayments();
        } catch (e) { alert("Xatolik"); }
    };

    const rejectPayment = async (requestId: string) => {
        if (!window.confirm("To'lovni rad etasizmi?")) return;
        try {
            const res = await fetch('https://speakpro-uz.onrender.com/api/admin/reject-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId })
            });
            if (res.ok) fetchPayments();
        } catch (e) { alert("Xatolik"); }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm("DIQQAT: User va uning barcha ma'lumotlari o'chib ketadi! Tasdiqlaysizmi?")) return;
        try {
            await fetch(`https://speakpro-uz.onrender.com/api/admin/users/${userId}`, { method: 'DELETE' });
            fetchUsers(page);
        } catch (e) { alert("Xatolik"); }
    };

    const handleDeleteFeedback = async (id: string) => {
        if (!window.confirm("O'chirilsinmi?")) return;
        try {
            await fetch(`https://speakpro-uz.onrender.com/api/admin/feedbacks/${id}`, { method: 'DELETE' });
            fetchFeedbacks();
        } catch (e) { alert("Xatolik"); }
    };

    const handleWalletUpdate = async () => {
        if (!walletModalUser) return;
        try {
            await fetch('https://speakpro-uz.onrender.com/api/admin/update-user-wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: walletModalUser._id,
                    amount: addAmount,
                    plan: setPlan,
                    exams: setExamCount,
                    days: 30
                })
            });
            alert("User wallet updated!");
            setWalletModalUser(null);
            setAddAmount('');
            fetchUsers(page);
        } catch (e) {
            alert("Error updating wallet");
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showPasswordModal || !newPassword) return;
        try {
            await fetch('https://speakpro-uz.onrender.com/api/admin/change-password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: showPasswordModal._id, newPassword })
            });
            alert("Parol o'zgartirildi.");
            setShowPasswordModal(null);
            setNewPassword('');
        } catch (e) { alert("Xatolik"); }
    };

    const formatPlanName = (plan: string) => {
        if (!plan) return 'Free';
        if (plan === 'unlimited_teacher') return 'Unlimited (Teacher)';
        return plan.charAt(0).toUpperCase() + plan.slice(1);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header & Tabs */}
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-800 pb-6 gap-4">
                    <h1 className="text-3xl font-bold text-white tracking-wider flex items-center gap-3">
                        <span className="bg-red-600 px-3 py-1 rounded text-sm font-mono">ADMIN</span>
                        <span className="text-slate-400">|</span>
                        SPEAKPRO CONTROL
                    </h1>

                    <div className="flex bg-slate-900 p-1 rounded-lg">
                        {['payments', 'users', 'analytics', 'feedbacks'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                {tab.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <button onClick={() => { logoutUser(); onLogout(); }} className="px-6 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-full text-xs font-bold tracking-widest">
                        EXIT
                    </button>
                </header>

                {/* --- PAYMENTS TAB (NEW) --- */}
                {activeTab === 'payments' && (
                    <div className="glass-card rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">User</th>
                                    <th className="p-4">Amount</th>
                                    <th className="p-4">Note</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading...</td></tr>
                                ) : payments.map((req) => (
                                    <tr key={req._id} className="hover:bg-slate-800/30">
                                        <td className="p-4 text-xs text-slate-500">{new Date(req.date).toLocaleTimeString()}</td>
                                        <td className="p-4">
                                            <div className="text-sm font-bold text-white">{req.userEmail}</div>
                                        </td>
                                        <td className="p-4 font-mono text-cyan-400 font-bold">
                                            {req.amount.toLocaleString()} UZS
                                        </td>
                                        <td className="p-4 text-sm text-slate-300">{req.note}</td>
                                        <td className="p-4 text-right flex justify-end gap-2">
                                            <button onClick={() => approvePayment(req._id)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-bold">Approve</button>
                                            <button onClick={() => rejectPayment(req._id)} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-bold">Reject</button>
                                        </td>
                                    </tr>
                                ))}
                                {payments.length === 0 && !loading && (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-600">Tasdiqlash kutilayotgan to'lovlar yo'q.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* --- USERS TAB --- */}
                {activeTab === 'users' && (
                    <div className="glass-card rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                    <tr>
                                        <th className="p-4">User Identity</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Balance</th>
                                        <th className="p-4">Performance</th>
                                        <th className="p-4 text-right">Controls</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {users.map((user) => (
                                        <React.Fragment key={user._id}>
                                            <tr className="hover:bg-slate-800/30 transition-colors group">
                                                <td className="p-4">
                                                    <div className="font-bold text-white text-sm">{user.firstName} {user.lastName}</div>
                                                    <div className="text-xs text-slate-500 font-mono">{user.email}</div>
                                                    {user.teacherName && <div className="text-[10px] text-indigo-400 mt-1">Teacher: {user.teacherName}</div>}
                                                    <div className="text-[10px] text-slate-600 mt-0.5 uppercase">{user.role}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${user.subscriptionPlan === 'pro' || user.subscriptionPlan === 'unlimited_teacher' ? 'bg-yellow-400' : 'bg-slate-500'}`}></span>
                                                            <span className="text-xs font-bold text-slate-300 uppercase">{formatPlanName(user.subscriptionPlan)}</span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 font-mono">
                                                            Credits: {user.examsLeft || 0}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-mono text-cyan-400 font-bold text-sm">
                                                        {(user.balance || 0).toLocaleString()}
                                                    </div>
                                                    <button
                                                        onClick={() => { setWalletModalUser(user); setSetPlan(user.subscriptionPlan || 'free'); setSetExamCount(user.examsLeft || ''); }}
                                                        className="text-[10px] text-slate-500 underline hover:text-green-400"
                                                    >
                                                        Edit Funds
                                                    </button>
                                                </td>
                                                <td className="p-4">
                                                    {user.lastExam ? (
                                                        <div className="bg-slate-950 border border-slate-800 rounded p-2 w-fit cursor-pointer" onClick={() => setExpandedRow(expandedRow === user._id ? null : user._id)}>
                                                            <div className="text-lg font-bold text-white leading-none">{user.lastExam.overallBand}</div>
                                                            <div className="text-[9px] text-slate-500 text-center">BAND</div>
                                                        </div>
                                                    ) : <span className="text-xs text-slate-600">-</span>}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setShowPasswordModal(user)} className="p-2 text-slate-500 hover:text-white bg-slate-800 rounded hover:bg-slate-700" title="Change Password">
                                                            🔑
                                                        </button>
                                                        <button onClick={() => handleDeleteUser(user._id)} className="p-2 text-red-500 hover:text-white bg-slate-800 rounded hover:bg-red-600" title="Delete User">
                                                            🗑
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* EXPANDED DETAILS */}
                                            {expandedRow === user._id && user.lastExam && (
                                                <tr className="bg-slate-900/50">
                                                    <td colSpan={5} className="p-4">
                                                        <div className="grid grid-cols-4 gap-4 text-center">
                                                            <div className="bg-slate-800 p-2 rounded">
                                                                <div className="text-xs text-slate-500">Fluency</div>
                                                                <div className="text-green-400 font-bold">{user.lastExam.fluencyScore}</div>
                                                            </div>
                                                            <div className="bg-slate-800 p-2 rounded">
                                                                <div className="text-xs text-slate-500">Lexical</div>
                                                                <div className="text-yellow-400 font-bold">{user.lastExam.lexicalScore}</div>
                                                            </div>
                                                            <div className="bg-slate-800 p-2 rounded">
                                                                <div className="text-xs text-slate-500">Grammar</div>
                                                                <div className="text-blue-400 font-bold">{user.lastExam.grammarScore}</div>
                                                            </div>
                                                            <div className="bg-slate-800 p-2 rounded">
                                                                <div className="text-xs text-slate-500">Pronunciation</div>
                                                                <div className="text-purple-400 font-bold">{user.lastExam.pronunciationScore}</div>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 text-xs text-slate-400 font-mono">
                                                            Weaknesses: {user.lastExam.weaknessTags?.join(', ')}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-slate-800 rounded disabled:opacity-50 text-sm">Prev</button>
                            <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
                            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-slate-800 rounded disabled:opacity-50 text-sm">Next</button>
                        </div>
                    </div>
                )}

                {/* --- ANALYTICS TAB --- */}
                {activeTab === 'analytics' && statsData && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
                        {/* KPI Cards */}
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                            <h3 className="text-slate-400 text-xs font-bold uppercase">Total Users</h3>
                            <p className="text-3xl font-bold text-white mt-2">{statsData.totalUsers}</p>
                        </div>
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                            <h3 className="text-slate-400 text-xs font-bold uppercase">Pro Subscribers</h3>
                            <p className="text-3xl font-bold text-yellow-400 mt-2">{statsData.proUsers}</p>
                        </div>
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                            <h3 className="text-slate-400 text-xs font-bold uppercase">Avg Band Score</h3>
                            <p className="text-3xl font-bold text-cyan-400 mt-2">{statsData.avgScore}</p>
                        </div>

                        {/* Activity Chart */}
                        <div className="md:col-span-2 bg-slate-900 p-6 rounded-xl border border-slate-800 h-80">
                            <h3 className="text-white font-bold mb-4">Activity (Last 24h)</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={statsData.activeHours?.map((val: number, idx: number) => ({ hour: idx, users: val })) || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="hour" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                                    <Line type="monotone" dataKey="users" stroke="#06b6d4" strokeWidth={3} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Report Text */}
                        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                            <h3 className="text-white font-bold mb-4">AI Business Report</h3>
                            <div className="text-sm text-slate-400 whitespace-pre-line leading-relaxed">
                                User retention is up by 15% this week. The 'Part 2' prep time seems to be the main drop-off point.
                                <br /><br />
                                <strong>Key Actions:</strong>
                                <ul className="list-disc ml-4 mt-2">
                                    <li>Optimize Onboarding: 20% of users drop off after signup.</li>
                                    <li>Promote PRO: Users with 3+ exams are 4x likely to buy PRO.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- FEEDBACKS TAB --- */}
                {activeTab === 'feedbacks' && (
                    <div className="grid gap-4">
                        {feedbacks.map(fb => (
                            <div key={fb._id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs px-2 py-0.5 rounded ${fb.type === 'exam' ? 'bg-cyan-900 text-cyan-400' : 'bg-purple-900 text-purple-400'}`}>
                                            {fb.type.toUpperCase()}
                                        </span>
                                        {fb.rating && <span className="text-yellow-400 text-sm">{'★'.repeat(fb.rating)}</span>}
                                    </div>
                                    <p className="text-white text-sm mb-2">"{fb.message}"</p>
                                    <div className="text-xs text-slate-500 font-mono">
                                        {fb.firstName} ({fb.email}) • {new Date(fb.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                {/* <button onClick={() => handleDeleteFeedback(fb._id)} className="text-slate-600 hover:text-red-500 transition-colors">✕</button> */}
                            </div>
                        ))}
                        {feedbacks.length === 0 && <p className="text-slate-500 text-center">No feedback yet.</p>}
                    </div>
                )}

            </div>

            {/* Wallet Modal */}
            {walletModalUser && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-full max-w-sm">
                        <h3 className="text-lg font-bold text-white mb-2">Manage Funds</h3>
                        <p className="text-sm text-slate-400 mb-4">{walletModalUser.email}</p>

                        <div className="mb-4 space-y-3">
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">Add Balance (+)</label>
                                <input type="number" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-cyan-500 outline-none" placeholder="e.g. 50000" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Plan</label>
                                    <select value={setPlan} onChange={(e) => setSetPlan(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white outline-none">
                                        <option value="free">Free</option>
                                        <option value="pro">Pro</option>
                                        <option value="unlimited_teacher">Unlimited Teacher</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Exam Credits</label>
                                    <input type="number" value={setExamCount} onChange={(e) => setSetExamCount(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white outline-none" placeholder="e.g. 5" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setWalletModalUser(null)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                            <button onClick={handleWalletUpdate} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold">Update</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl w-full max-w-sm">
                        <h3 className="text-lg font-bold text-white mb-2">Change Password</h3>
                        <p className="text-sm text-slate-400 mb-4">{showPasswordModal.email}</p>
                        <input
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password..."
                            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white focus:border-cyan-500 outline-none mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowPasswordModal(null)} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                            <button onClick={handleChangePassword} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold">Save</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminPanel;
