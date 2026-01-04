
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { trackEvent } from '../utils/analytics';
import { saveUser } from '../utils/storageUtils';
import { SELF_TARIFFS } from '../config/selfTariffs';
import { TEACHER_TARIFFS } from '../config/teacherTariffs';

interface PaymentModalProps {
  user: UserProfile;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ user, onClose }) => {
  const [step, setStep] = useState(1); // 1=Select, 2=PayManual, 3=Success, 4=ConfirmPurchase
  const [amount, setAmount] = useState('0');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  
  // For Manual Payment
  const [manualNote, setManualNote] = useState(''); // Text note
  const [receiptFile, setReceiptFile] = useState<File | null>(null); // File upload
  
  // For Direct Purchase
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
      if (user.role === 'teacher') {
          // Load Teacher Tariffs
          const tPlans = Object.values(TEACHER_TARIFFS).map(t => ({
              id: t.id,
              name: t.title,
              price: t.price,
              desc: t.description,
              popular: t.isPopular
          }));
          setPlans(tPlans);
      } else {
          // Load Student Tariffs
          const sPlans = [
            {
                id: SELF_TARIFFS.UNLOCK_RESULT.id,
                name: SELF_TARIFFS.UNLOCK_RESULT.title,
                price: SELF_TARIFFS.UNLOCK_RESULT.price,
                desc: SELF_TARIFFS.UNLOCK_RESULT.description
            },
            {
                id: SELF_TARIFFS.ONE_EXAM.id,
                name: SELF_TARIFFS.ONE_EXAM.title,
                price: SELF_TARIFFS.ONE_EXAM.price,
                desc: SELF_TARIFFS.ONE_EXAM.description
            },
            {
                id: SELF_TARIFFS.FIVE_EXAMS.id,
                name: SELF_TARIFFS.FIVE_EXAMS.title,
                price: SELF_TARIFFS.FIVE_EXAMS.price,
                desc: SELF_TARIFFS.FIVE_EXAMS.description,
                popular: true
            },
            {
                id: SELF_TARIFFS.PRO_SUBSCRIPTION.id,
                name: SELF_TARIFFS.PRO_SUBSCRIPTION.title,
                price: SELF_TARIFFS.PRO_SUBSCRIPTION.price,
                desc: SELF_TARIFFS.PRO_SUBSCRIPTION.description,
                isSub: true
            }
          ];
          setPlans(sPlans);
      }
  }, [user.role]);

  const handleSelectPlan = (plan: any) => {
      setSelectedPlan(plan);
      const cost = plan.price;
      const balance = user.balance || 0;

      if (balance >= cost) {
          // Sufficient funds -> Confirm Purchase directly
          setAmount(cost.toString());
          setStep(4); 
      } else {
          // Insufficient funds -> Calculate difference
          const needed = cost - balance;
          setAmount(needed.toString());
          setNote(`${plan.name} (Yetmayotgan qism)`);
          setStep(2);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setReceiptFile(e.target.files[0]);
      }
  };

  const handleDirectPurchase = async () => {
      setLoading(true);
      try {
          const res = await fetch('http://localhost:5000/api/wallet/purchase-plan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user._id || user.id, planId: selectedPlan.id })
          });
          const data = await res.json();
          if (res.ok) {
              alert("Muvaffaqiyatli xarid qilindi!");
              saveUser(data.user); // Update local storage
              window.location.reload(); // Refresh app to reflect changes
              onClose();
          } else {
              alert(data.message);
          }
      } catch (e) {
          alert("Aloqa yo'q");
      } finally {
          setLoading(false);
      }
  };

  const handleSendManualRequest = async () => {
      if (!manualNote && !receiptFile) {
          alert("Iltimos, ismingizni yozing yoki chek rasmini yuklang.");
          return;
      }
      setLoading(true);
      try {
          const formData = new FormData();
          formData.append('userId', user._id || user.id || '');
          formData.append('amount', amount);
          formData.append('note', `${note} | Info: ${manualNote}`);
          if (receiptFile) {
              formData.append('receipt', receiptFile);
          }

          const res = await fetch('http://localhost:5000/api/wallet/request-manual-payment', {
              method: 'POST',
              body: formData 
          });
          
          if (res.ok) {
              setStep(3); 
          } else {
              alert("Xatolik yuz berdi. Qaytadan urining.");
          }
      } catch (e) {
          alert("Server bilan aloqa yo'q.");
      } finally {
          setLoading(false);
      }
  };

  const CARD_NUMBER = "9860 0301 4647 7754";
  const CARD_HOLDER = "Mirshod Adizov";

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col transition-colors duration-300">
            
            <div className="p-6 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                    {step === 4 ? "Tasdiqlash" : "Balansni to'ldirish"}
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">✕</button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto max-h-[70vh]">
                {/* STEP 1: CHOOSE PLAN */}
                {step === 1 && (
                    <>
                        <div className="mb-4 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                             <span className="text-sm text-slate-600 dark:text-slate-300">Sizning balansingiz:</span>
                             <span className="font-bold text-slate-900 dark:text-white font-mono">{(user.balance || 0).toLocaleString()} UZS</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Kerakli tarifni tanlang:</p>
                        <div className="space-y-3 mb-6">
                            {plans.map(plan => (
                                <div 
                                    key={plan.id}
                                    onClick={() => handleSelectPlan(plan)}
                                    className="border border-slate-200 dark:border-slate-700 hover:border-cyan-500 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl cursor-pointer transition-all flex justify-between items-center group relative overflow-hidden"
                                >
                                    {plan.popular && <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">BESTSELLER</div>}
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-cyan-600">{plan.name}</div>
                                        <div className="text-xs text-slate-500">{plan.desc}</div>
                                    </div>
                                    <div className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{plan.price.toLocaleString()} so'm</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* STEP 4: CONFIRM DIRECT PURCHASE (Sufficient Balance) */}
                {step === 4 && selectedPlan && (
                    <div className="text-center py-4">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{selectedPlan.name}</h3>
                        <p className="text-slate-500 text-sm mb-6">Balansingiz yetarli. To'lovni tasdiqlaysizmi?</p>
                        
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6">
                             <div className="flex justify-between mb-2 text-sm">
                                 <span className="text-slate-500">Hozirgi balans:</span>
                                 <span className="font-mono text-slate-900 dark:text-white">{(user.balance || 0).toLocaleString()}</span>
                             </div>
                             <div className="flex justify-between mb-2 text-sm">
                                 <span className="text-slate-500">Narxi:</span>
                                 <span className="font-mono text-red-500">-{selectedPlan.price.toLocaleString()}</span>
                             </div>
                             <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2 flex justify-between font-bold">
                                 <span className="text-slate-900 dark:text-white">Qoladigan balans:</span>
                                 <span className="font-mono text-green-500">{((user.balance || 0) - selectedPlan.price).toLocaleString()}</span>
                             </div>
                        </div>

                        <button 
                            onClick={handleDirectPurchase}
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold shadow-lg transition-transform hover:scale-[1.02]"
                        >
                            {loading ? "Jarayonda..." : "Hozir Sotib Olish"}
                        </button>
                        <button onClick={() => setStep(1)} className="mt-4 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">Bekor qilish</button>
                    </div>
                )}

                {/* STEP 2: MANUAL TRANSFER (Insufficient Balance) */}
                {step === 2 && selectedPlan && (
                    <div className="h-full flex flex-col">
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/50 rounded-xl p-4 mb-6">
                            <h4 className="text-orange-700 dark:text-orange-400 font-bold text-sm mb-1 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                Balans yetarli emas
                            </h4>
                            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1 mt-2">
                                <div className="flex justify-between"><span>Paket narxi:</span> <b>{selectedPlan.price.toLocaleString()}</b></div>
                                <div className="flex justify-between"><span>Sizda bor:</span> <b>{(user.balance || 0).toLocaleString()}</b></div>
                                <div className="border-t border-orange-200 dark:border-orange-700 pt-1 mt-1 flex justify-between text-red-600 dark:text-red-400 font-bold">
                                    <span>Yetmayotgan qism:</span> <span>{Number(amount).toLocaleString()} UZS</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-center mb-4">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">To'lov qilishingiz kerak:</p>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white font-mono">{Number(amount).toLocaleString()} so'm</div>
                        </div>

                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 relative">
                            <p className="text-xs text-slate-500 mb-2">Quyidagi kartaga o'tkazing:</p>
                            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-600 mb-2">
                                <span className="font-mono text-lg font-bold text-slate-800 dark:text-slate-200 tracking-widest">{CARD_NUMBER}</span>
                                <button 
                                    onClick={() => navigator.clipboard.writeText(CARD_NUMBER.replace(/\s/g, ''))}
                                    className="text-cyan-500 hover:text-cyan-600 text-xs font-bold uppercase"
                                >
                                    Copy
                                </button>
                            </div>
                            <div className="text-right text-xs font-bold text-slate-600 dark:text-slate-400">{CARD_HOLDER}</div>
                        </div>

                        <div className="mb-6 space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">To'lov cheki (Screenshot/PDF):</label>
                                <label className="flex items-center gap-3 w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 border-dashed rounded-lg p-3 cursor-pointer hover:border-cyan-500 transition-colors">
                                    <div className="bg-slate-200 dark:bg-slate-800 p-2 rounded text-slate-500">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <span className="text-sm text-slate-600 dark:text-slate-300 truncate block">
                                            {receiptFile ? receiptFile.name : "Faylni tanlash..."}
                                        </span>
                                    </div>
                                    <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                                </label>
                            </div>
                            
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Yoki karta egasi ismi:</label>
                                <input 
                                    type="text" 
                                    value={manualNote}
                                    onChange={(e) => setManualNote(e.target.value)}
                                    placeholder="Masalan: Azizbek T."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleSendManualRequest}
                            disabled={loading || (!manualNote && !receiptFile)}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
                        >
                            {loading ? "Yuborilmoqda..." : "To'ladim, tekshiring"}
                        </button>

                        <button onClick={() => setStep(1)} className="w-full text-slate-500 text-sm hover:text-slate-800 dark:hover:text-white py-4 mt-auto">Orqaga qaytish</button>
                    </div>
                )}

                {/* STEP 3: SUCCESS */}
                {step === 3 && (
                    <div className="text-center py-6 h-full flex flex-col justify-center animate-fade-in-up">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">So'rov yuborildi</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                            Admin to'lovni tasdiqlashi bilan hisobingiz to'ldiriladi. <br/>
                            <span className="font-bold">Keyin "{selectedPlan?.name}"ni sotib olishingiz mumkin.</span>
                        </p>
                        <button onClick={onClose} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-bold shadow-lg">Tushunarli</button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default PaymentModal;
