
import React, { useState } from 'react';

interface LandingProps {
  onStart: () => void;
}

const Landing: React.FC<LandingProps> = ({ onStart }) => {
  const [showVideo, setShowVideo] = useState(false);
  const [showSample, setShowSample] = useState(false); // NEW STATE
  const [activeLang, setActiveLang] = useState<'UZ' | 'EN'>('EN'); // Default EN
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // --- CONVERSION FOCUSED COPY ---
  const t = {
    UZ: {
      nav: { features: "Afzalliklar", comparison: "Farqi", pricing: "Narxlar", login: "Kirish" },
      heroTitle: "IELTS Speakingdan",
      heroTitleHighlight: "7.5+ Ball Oling",
      heroSubtitle: "Imtihon hayajonini yengishning eng yaxshi yo'li. AI Examiner bilan xuddi real imtihondagidek mashq qiling.",
      startBtn: "HOZIROQ BEPUL BOSHLASH",
      sampleBtn: "NAMUNANI KO'RISH", // NEW
      noCard: "⚡ Karta talab qilinmaydi. 1 daqiqada hisob oching.",
      probTitle: "Nega ballingiz oshmayapti?",
      probSub: "Muammo sizning bilimingizda emas, muammo — amaliyot kamligida.",
      prob1: "Imtihon hayajoni",
      prob1Desc: "Examiner oldida o'zingizni yo'qotib qo'yasizmi? Buni yengishning yagona yo'li — ko'p marta imtihon topshirish.",
      prob2: "Fikrlar kelmasligi",
      prob2Desc: "\"Meni aytadigan gapim yo'q\" — eng katta dushman. AI sizga har xil mavzularda savol berib, fikrlashingizni ochadi.",
      prob3: "Repetitor qimmat",
      prob3Desc: "Har kuni repetitor bilan gaplashishga imkoniyat yo'qmi? AI 24/7 siz bilan.",
      solTitle: "SpeakPro — cho'ntakdagi imtihon.",
      solTitle2: "Bu shunchaki ilova emas, bu sizning shaxsiy murabbiyingiz.",
      sol1: "3 Soniyada Natija",
      sol1Desc: "Kutish yo'q. Imtihon tugashi bilan Band Score va xatolaringizni ko'rasiz.",
      sol2: "Real Imtihon Muhiti",
      sol2Desc: "Qat'iy vaqt, kutilmagan savollar va examiner bosimi. Imtihonga tayyor bo'ling.",
      sol3: "Cheksiz Mashqlar",
      sol3Desc: "Xohlasangiz ertalab, xohlasangiz tunda. SpeakPro hech qachon charchamaydi.",
      sol4: "Shaxsiy Drills",
      sol4Desc: "AI sizning xatoyingizni topib, aynan shu xato ustida mashq qildiradi.",
      howTitle: "Qanday ishlaydi?",
      step1: "Mavzu tushadi",
      step2: "Gapirasiz (Part 1-3)",
      step3: "Ball olasiz",
      step4: "Xatoni to'g'irlaysiz",
      testiTitle: "Natijalar gapiradi",
      testiSub: "Minglab o'quvchilar SpeakPro yordamida o'z maqsadlariga erishdilar.",
      reviews: [
          { name: "Azizbek T.", band: "Band 7.5", text: "Haqiqiy imtihondagidek bosim bo'ldi. Part 2 da vaqt tugashini bilmay qolardim, bu yerda taymer bilan ishlashni o'rgandim.", stars: 5 },
          { name: "Malika S.", band: "Band 7.0", text: "Repetitorim bilan haftada 2 marta qilardik, bu yerda esa har kuni mashq qildim. 6.0 dan 7.0 ga chiqdim.", stars: 5 },
          { name: "Jamshid K.", band: "Band 8.0", text: "Feedbacklari dahshat. Qaysi so'zni noto'g'ri talaffuz qilganimni sekundigacha aytib beradi.", stars: 5 },
      ],
      vsTitle: "Eski usul vs SpeakPro",
      vsSub: "Repetitor strategiyani o'rgatadi. Biz esa takrorlashni beramiz.",
      vsRepetitor: "Repetitor",
      vsAi: "SpeakPro AI",
      vsRow1: "Haftada 2-3 soat amaliyot",
      vsRow1Ai: "24/7 Cheksiz amaliyot",
      vsRow2: "Subyektiv baho",
      vsRow2Ai: "Obyektiv & Batafsil tahlil",
      vsRow3: "Qimmat ($100+/oy)",
      vsRow3Ai: "Deyarli tekin",
      priceHeader: "Hozircha hamyonni ochmang",
      priceSub: "Avval tizimni bepul sinab ko'ring. Yoqsa, keyin davom ettirasiz.",
      freePlanBtn: "BEPUL SINOVNI BOSHLASH",
      paidPlanBtn: "Xarid qilish",
      faqTitle: "Ko'p so'raladigan savollar",
      ctaTitle: "7.5+ Ball sari birinchi qadam",
      ctaSub: "Sizda yo'qotadigan hech narsa yo'q, lekin yutadiganingiz — kelajagingiz.",
      ctaBtn: "BEPUL IMTIHONNI BOSHLASH",
      stuTitle: "Mustaqil o'rganuvchilar uchun",
      priceCards: {
          one: { title: "1 ta Imtihon", desc: "Sinov", price: "BEPUL", valueProp: "Xavfsiz start. To'liq analiz." },
          five: { title: "5 ta Imtihon", desc: "Intensiv", price: "39,000 so'm", valueProp: "Ommabop. Donasi 7,800 so'mdan." },
          pro: { title: "PRO Obuna", desc: "Cheksiz", price: "49,000 so'm", valueProp: "30 kunlik cheksiz kirish." }
      }
    },
    EN: {
      nav: { features: "Benefits", comparison: "Compare", pricing: "Pricing", login: "Login" },
      heroTitle: "Score Band 7.5+ in",
      heroTitleHighlight: "IELTS Speaking",
      heroSubtitle: "The best way to overcome exam anxiety. Practice with an AI Examiner just like the real test.",
      startBtn: "START FREE EXAM NOW",
      sampleBtn: "SEE SAMPLE REPORT", // NEW
      noCard: "⚡ No credit card required. Account setup in 1 min.",
      probTitle: "Why is your score stuck?",
      probSub: "The problem isn't your English, it's the lack of practice under pressure.",
      prob1: "Exam Anxiety",
      prob1Desc: "Do you freeze in front of the examiner? The only cure is repeated exposure.",
      prob2: "Running out of Ideas",
      prob2Desc: "\"I have nothing to say.\" Our AI challenges you with diverse topics to unlock your flow.",
      prob3: "Tutors are Expensive",
      prob3Desc: "Can't afford daily lessons? SpeakPro is your 24/7 partner for a fraction of the cost.",
      solTitle: "SpeakPro is your Pocket Examiner.",
      solTitle2: "Not just an app, but a personal coach.",
      sol1: "Instant Score",
      sol1Desc: "No waiting. Get your Band Score and error analysis immediately after the test.",
      sol2: "Real Exam Mode",
      sol2Desc: "Strict timers, realistic silence, and pressure. Be ready for the real day.",
      sol3: "Unlimited Practice",
      sol3Desc: "Practice at 6 AM or 11 PM. SpeakPro never gets tired.",
      sol4: "Smart Drills",
      sol4Desc: "We create personalized drills based on your specific mistakes.",
      howTitle: "How it works?",
      step1: "Get Topic",
      step2: "Speak (Part 1-3)",
      step3: "Get Analysis",
      step4: "Practice Drills",
      testiTitle: "Results speak louder",
      testiSub: "Thousands of students reached their target scores with SpeakPro.",
      reviews: [
          { name: "Azizbek T.", band: "Band 7.5", text: "The pressure felt just like the real exam. I used to run out of time in Part 2, but this helped me manage it perfectly.", stars: 5 },
          { name: "Malika S.", band: "Band 7.0", text: "I only practiced twice a week with my tutor, but here I practiced daily. Improved from 6.0 to 7.0.", stars: 5 },
          { name: "Jamshid K.", band: "Band 8.0", text: "The feedback is insane. It tells me exactly which word I mispronounced down to the second.", stars: 5 },
      ],
      vsTitle: "Old Way vs SpeakPro",
      vsSub: "Tutors teach you strategy. SpeakPro gives you the reps.",
      vsRepetitor: "Human Tutor",
      vsAi: "SpeakPro AI",
      vsRow1: "Practice 2-3 hours/week",
      vsRow1Ai: "Practice Unlimited 24/7",
      vsRow2: "Subjective feedback",
      vsRow2Ai: "Data-driven deep analysis",
      vsRow3: "Expensive ($100+/mo)",
      vsRow3Ai: "Affordable (Coffee price)",
      priceHeader: "Keep your wallet closed",
      priceSub: "Try the system for free first. Upgrade only if you love it.",
      freePlanBtn: "START FREE TRIAL",
      paidPlanBtn: "Buy Package",
      faqTitle: "Frequently Asked Questions",
      ctaTitle: "Your first step to Band 7.5+",
      ctaSub: "You have nothing to lose, but a better future to gain.",
      ctaBtn: "START FREE SPEAKING MOCK",
      stuTitle: "For Self-Study Students",
      priceCards: {
          one: { title: "1st Exam", desc: "Trial", price: "FREE", valueProp: "Risk-free start. Full analysis included." },
          five: { title: "5 Exams", desc: "Intensive", price: "39,000 UZS", valueProp: "Popular. Only 7,800 UZS per exam." },
          pro: { title: "PRO Plan", desc: "Unlimited", price: "49,000 UZS", valueProp: "Unlimited access for 30 days." }
      }
    }
  };

  const text = t[activeLang];

  const faqs = [
      { 
        q: activeLang === 'UZ' ? "AI Examiner haqiqatan ham aniqmi?" : "Is the AI score accurate?", 
        a: activeLang === 'UZ' ? "Ha. Biz rasmiy IELTS Band Descriptors asosida ishlaymiz. Ko'plab o'quvchilarimiz real imtihonda xuddi shu ballni olishmoqda." : "Yes. We use official IELTS Band Descriptors. Most users score within 0.5 of their real exam result." 
      },
      { 
        q: activeLang === 'UZ' ? "Birinchi imtihon rostan ham bepulmi?" : "Is the first exam really free?", 
        a: activeLang === 'UZ' ? "Ha, 100% bepul. Karta ulash shart emas. Shunchaki kirib, topshirib ko'ring." : "Yes, 100% free. No credit card required. Just sign up and start speaking." 
      },
      { 
         q: activeLang === 'UZ' ? "Bu repetitor o'rnini bosa oladimi?" : "Can this replace a tutor?",
         a: activeLang === 'UZ' ? "Repetitor strategiya o'rgatadi, SpeakPro esa amaliyot beradi. Ikkisi birgalikda — mukammal natija." : "Your tutor teaches strategy. SpeakPro provides the repetition and practice environment."
      }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans overflow-x-hidden relative transition-colors duration-300 selection:bg-cyan-200 dark:selection:bg-cyan-900">
      
      {/* 0. NAVBAR - Sticky & Blurred */}
      <nav className="z-50 w-full px-6 py-4 flex justify-between items-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 border-b border-slate-200 dark:border-slate-800 transition-all">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onStart}>
              <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              </div>
              <span className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">Speak<span className="text-cyan-600 dark:text-cyan-400">Pro</span></span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
              <a href="#benefits" className="hover:text-cyan-600 dark:hover:text-white transition-colors">{text.nav.features}</a>
              <a href="#comparison" className="hover:text-cyan-600 dark:hover:text-white transition-colors">{text.nav.comparison}</a>
              <a href="#pricing" className="hover:text-cyan-600 dark:hover:text-white transition-colors">{text.nav.pricing}</a>
          </div>

          <div className="flex items-center gap-3">
              <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800">
                  {['UZ', 'EN'].map(lang => (
                      <button 
                        key={lang}
                        onClick={() => setActiveLang(lang as any)}
                        className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${activeLang === lang ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                          {lang}
                      </button>
                  ))}
              </div>
              <button 
                onClick={onStart}
                className="hidden md:block bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:opacity-90 px-5 py-2 rounded-full transition-all text-xs font-bold shadow-lg"
              >
                {text.nav.login}
              </button>
          </div>
      </nav>

      {/* 1. HERO SECTION */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-20 text-center lg:text-left flex flex-col lg:flex-row items-center gap-12 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[120px] -z-10 dark:bg-cyan-900/20"></div>

          <div className="lg:w-1/2 relative z-10">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-green-500/30 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-widest animate-fade-in-up">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Free First Mock Exam
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 text-slate-900 dark:text-white tracking-tight">
                  {text.heroTitle} <br className="hidden md:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600 dark:from-cyan-400 dark:to-blue-500">
                      {text.heroTitleHighlight}
                  </span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                  {text.heroSubtitle}
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <button 
                    onClick={onStart}
                    className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-[0_10px_30px_rgba(6,182,212,0.4)] hover:shadow-[0_15px_40px_rgba(6,182,212,0.5)] transition-all transform hover:-translate-y-1 active:scale-95"
                  >
                      {text.startBtn} &rarr;
                  </button>
                  {/* SAMPLE REPORT BUTTON */}
                  <button 
                    onClick={() => setShowSample(true)}
                    className="w-full sm:w-auto bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-8 py-4 rounded-xl font-bold text-lg transition-all"
                  >
                      {text.sampleBtn}
                  </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500 font-medium mt-4 text-center sm:text-left">
                  {text.noCard}
              </p>
          </div>

          <div className="lg:w-1/2 w-full relative group perspective-1000">
               <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
               <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 aspect-video transform transition-transform duration-500 group-hover:rotate-1">
                   <img 
                    src="/header-bg.jpg" 
                    alt="Zoom Conference One on One" 
                    className="w-full h-full object-cover opacity-90"
                    loading="eager"
                    fetchPriority="high"
                  />
                  {/* UI Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent flex flex-col justify-end p-6">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden">
                              <img src="/examiner_poster.jpg" className="w-full h-full object-cover" alt="AI Avatar" onError={(e) => e.currentTarget.style.display='none'} />
                              <div className="w-full h-full bg-slate-700"></div>
                          </div>
                          <div>
                              <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded w-fit mb-1 animate-pulse">REC ●</div>
                              <div className="text-white font-mono text-sm font-bold">Speaking Part 2: 00:59</div>
                          </div>
                      </div>
                  </div>
               </div>
          </div>
      </header>

      {/* SAMPLE REPORT MODAL */}
      {showSample && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
              <div className="bg-slate-900 rounded-3xl w-full max-w-2xl border border-slate-800 shadow-2xl overflow-hidden relative my-8">
                  <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 flex justify-between items-center">
                      <h3 className="text-white font-bold text-xl">🚀 Sample Band 7.5 Report</h3>
                      <button onClick={() => setShowSample(false)} className="text-white/80 hover:text-white bg-white/10 rounded-full p-2">✕</button>
                  </div>
                  <div className="p-6 md:p-8 space-y-6">
                      {/* Overall Score */}
                      <div className="text-center mb-8">
                          <div className="text-6xl font-extrabold text-white mb-2">7.5</div>
                          <div className="text-sm text-cyan-400 uppercase tracking-widest font-bold">Overall Band Score</div>
                      </div>
                      
                      {/* Sub Scores */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                              <div className="text-green-400 font-bold text-2xl">8.0</div>
                              <div className="text-xs text-slate-500 uppercase">Fluency</div>
                          </div>
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                              <div className="text-yellow-400 font-bold text-2xl">7.5</div>
                              <div className="text-xs text-slate-500 uppercase">Lexical</div>
                          </div>
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                              <div className="text-blue-400 font-bold text-2xl">6.5</div>
                              <div className="text-xs text-slate-500 uppercase">Grammar</div>
                          </div>
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                              <div className="text-purple-400 font-bold text-2xl">7.5</div>
                              <div className="text-xs text-slate-500 uppercase">Pronunciation</div>
                          </div>
                      </div>

                      {/* Coach Tip */}
                      <div className="bg-indigo-900/30 border border-indigo-500/30 p-5 rounded-xl">
                          <h4 className="text-indigo-400 font-bold text-sm mb-2 flex items-center gap-2">💡 AI Coach Tip:</h4>
                          <p className="text-slate-300 text-sm italic">"Your fluency is great, but you struggle with complex grammar structures in Part 3. Use more passive voice and conditional sentences."</p>
                      </div>

                      {/* Vocabulary Improvement */}
                      <div>
                          <h4 className="text-white font-bold mb-3 text-sm uppercase">Vocabulary Upgrades</h4>
                          <div className="space-y-2">
                              <div className="flex justify-between items-center text-sm p-3 bg-slate-950 rounded-lg border border-slate-800">
                                  <span className="text-red-400 line-through">Very good</span>
                                  <span className="text-green-400 font-bold">Exceptional / Outstanding</span>
                              </div>
                              <div className="flex justify-between items-center text-sm p-3 bg-slate-950 rounded-lg border border-slate-800">
                                  <span className="text-red-400 line-through">I think</span>
                                  <span className="text-green-400 font-bold">From my perspective</span>
                              </div>
                          </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800">
                          <button onClick={onStart} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-500/20">
                              Get My Real Report
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 2. PROBLEM AGITATION - Better Typography */}
      <section className="bg-slate-50 dark:bg-slate-900 py-20 border-y border-slate-200 dark:border-slate-800">
          <div className="max-w-5xl mx-auto px-6">
              <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">{text.probTitle}</h2>
                  <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 italic font-medium">"{text.probSub}"</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                  {[
                      { icon: "😰", title: text.prob1, desc: text.prob1Desc, border: "border-red-500" },
                      { icon: "🤐", title: text.prob2, desc: text.prob2Desc, border: "border-orange-500" },
                      { icon: "📉", title: text.prob3, desc: text.prob3Desc, border: "border-yellow-500" }
                  ].map((item, idx) => (
                      <div key={idx} className={`bg-white dark:bg-slate-950 p-8 rounded-2xl border-t-4 ${item.border} shadow-lg hover:shadow-xl transition-shadow`}>
                          <div className="text-4xl mb-4">{item.icon}</div>
                          <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3">{item.title}</h3>
                          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* 3. SOLUTION (BENEFITS) */}
      <section id="benefits" className="py-24 bg-white dark:bg-slate-950 relative overflow-hidden">
          {/* Decorative Grid */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto px-6 relative z-10">
              <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">{text.solTitle}</h2>
                  <p className="text-cyan-600 dark:text-cyan-400 text-lg font-bold uppercase tracking-wide">{text.solTitle2}</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                      { icon: "⚡", title: text.sol1, desc: text.sol1Desc, color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" },
                      { icon: "🎯", title: text.sol2, desc: text.sol2Desc, color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
                      { icon: "♾️", title: text.sol3, desc: text.sol3Desc, color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
                      { icon: "💪", title: text.sol4, desc: text.sol4Desc, color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" },
                  ].map((item, idx) => (
                      <div key={idx} className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-all group hover:-translate-y-1 duration-300">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-6 ${item.color} transition-transform group-hover:scale-110`}>
                              {item.icon}
                          </div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-3">{item.title}</h3>
                          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* 4. HOW IT WORKS - Simplified */}
      <section id="how" className="py-20 bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-6 text-center">
               <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-12">{text.howTitle}</h2>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative">
                   {/* Line for Desktop */}
                   <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-gradient-to-r from-slate-200 via-cyan-500 to-slate-200 dark:from-slate-800 dark:via-cyan-900 dark:to-slate-800 -z-0"></div>
                   
                   {[
                       { i: 1, t: text.step1, icon: "🎲" },
                       { i: 2, t: text.step2, icon: "🗣️" },
                       { i: 3, t: text.step3, icon: "📊" },
                       { i: 4, t: text.step4, icon: "🚀" },
                   ].map((step) => (
                       <div key={step.i} className="relative z-10 flex flex-col items-center">
                           <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center text-3xl shadow-lg mb-4">
                               {step.icon}
                           </div>
                           <div className="font-bold text-slate-900 dark:text-white text-sm md:text-base">{step.t}</div>
                       </div>
                   ))}
               </div>
          </div>
      </section>

      {/* 5. TESTIMONIALS */}
      <section className="py-24 bg-white dark:bg-slate-950">
           <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{text.testiTitle}</h2>
                  <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">{text.testiSub}</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                  {text.reviews.map((review, i) => (
                      <div key={i} className="bg-slate-50 dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500/30 transition-all flex flex-col h-full shadow-sm">
                          <div className="flex items-center gap-3 mb-6">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center font-bold text-lg shadow-md">
                                  {review.name.charAt(0)}
                              </div>
                              <div>
                                  <div className="font-bold text-slate-900 dark:text-white text-base">{review.name}</div>
                                  <div className="text-xs text-green-600 dark:text-green-400 font-bold bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded w-fit mt-1">{review.band}</div>
                              </div>
                              <div className="ml-auto flex gap-0.5">
                                  {[...Array(review.stars)].map((_, si) => (
                                      <span key={si} className="text-yellow-400 text-sm">★</span>
                                  ))}
                              </div>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed italic flex-1">
                              "{review.text}"
                          </p>
                      </div>
                  ))}
              </div>
           </div>
      </section>

      {/* 6. COMPARISON SECTION */}
      <section id="comparison" className="py-24 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-4xl mx-auto px-6">
              <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{text.vsTitle}</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-lg">{text.vsSub}</p>
              </div>
              
              <div className="bg-white dark:bg-slate-950 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                  <div className="grid grid-cols-3 gap-4 text-center border-b border-slate-200 dark:border-slate-800 pb-6 mb-6">
                      <div className="font-bold text-slate-400 text-xs uppercase tracking-wider text-left pt-2">Feature</div>
                      <div className="font-bold text-slate-500 text-sm">{text.vsRepetitor}</div>
                      <div className="font-bold text-cyan-600 dark:text-cyan-400 text-lg">{text.vsAi}</div>
                  </div>
                  
                  {[
                      { l: "Practice Volume", m: text.vsRow1, a: text.vsRow1Ai },
                      { l: "Feedback Type", m: text.vsRow2, a: text.vsRow2Ai },
                      { l: "Cost", m: text.vsRow3, a: text.vsRow3Ai }
                  ].map((row, i) => (
                      <div key={i} className="grid grid-cols-3 gap-4 items-center py-6 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                          <div className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300">{row.l}</div>
                          <div className="text-xs md:text-sm text-slate-500">{row.m}</div>
                          <div className="text-xs md:text-sm font-bold text-slate-900 dark:text-white flex flex-col md:flex-row items-center justify-center md:justify-start gap-2 bg-green-50 dark:bg-green-900/10 p-2 rounded-lg md:bg-transparent">
                              <span className="text-green-500 text-lg">✓</span> <span className="text-center md:text-left">{row.a}</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* 7. SEGMENTATION */}
      <section className="py-20 bg-white dark:bg-slate-950">
          <div className="max-w-3xl mx-auto px-6">
              <div className="bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-3xl p-8 text-center">
                  <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm">🎓</div>
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3">{text.stuTitle}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-base mb-6 max-w-lg mx-auto">Ideal for self-study candidates aiming for Band 7.0+ who need more practice volume than a traditional tutor can provide.</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 uppercase tracking-widest font-bold">Also available for Teachers (B2B)</p>
              </div>
          </div>
      </section>

      {/* 8. PRICING */}
      <section id="pricing" className="py-24 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-6">
              <div className="text-center mb-16">
                  <h2 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white">{text.priceHeader}</h2>
                  <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">{text.priceSub}</p>
              </div>
              
              {/* PRIMARY RISK-FREE OFFER */}
              <div className="mb-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl p-1 p-[2px] shadow-2xl transform hover:scale-[1.01] transition-transform max-w-4xl mx-auto">
                  <div className="bg-white dark:bg-slate-950 rounded-[22px] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 h-full">
                      <div className="flex-1 text-center md:text-left">
                          <div className="inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wide mb-4">
                              Step 1: Start Here
                          </div>
                          <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{text.priceCards.one.title}</h3>
                          <p className="text-slate-600 dark:text-slate-300 text-lg mb-4">{text.priceCards.one.valueProp}</p>
                          <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400 inline-block text-left">
                              <li className="flex gap-2">✅ Full Speaking Test (Part 1-3)</li>
                              <li className="flex gap-2">✅ AI Band Score & Feedback</li>
                              <li className="flex gap-2">✅ Personalized Drill Generation</li>
                          </ul>
                      </div>
                      <div className="flex flex-col items-center gap-2 min-w-[200px]">
                          <div className="text-5xl font-extrabold text-green-600 dark:text-green-500">{text.priceCards.one.price}</div>
                          <div className="text-xs text-slate-400 line-through">9,000 UZS</div>
                          <button onClick={onStart} className="w-full bg-green-600 hover:bg-green-500 text-white py-4 px-8 rounded-xl font-bold text-lg shadow-lg shadow-green-500/30 transition-all mt-2">
                              {text.freePlanBtn} &rarr;
                          </button>
                          <p className="text-[10px] text-slate-400 mt-2">No credit card required</p>
                      </div>
                  </div>
              </div>

              {/* PAID UPGRADES */}
              <div className="text-center mb-8">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Step 2: Upgrade when you are ready</span>
              </div>

              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                   {/* Card 2: POPULAR */}
                   <div className="bg-slate-900 dark:bg-slate-800 p-8 rounded-3xl border border-cyan-500 relative shadow-xl flex flex-col">
                      <div className="absolute top-0 right-0 bg-cyan-500 text-white text-xs font-bold px-4 py-1 rounded-bl-xl rounded-tr-2xl">MOST POPULAR</div>
                      <h3 className="text-xl font-bold text-white mb-2">{text.priceCards.five.title}</h3>
                      <div className="text-4xl font-bold text-white mb-4">{text.priceCards.five.price}</div>
                      <p className="text-sm text-cyan-100 italic mb-8 border-b border-white/10 pb-8">"{text.priceCards.five.valueProp}"</p>
                      
                      <button onClick={onStart} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-colors shadow-lg mt-auto">
                          {text.paidPlanBtn}
                      </button>
                  </div>

                  {/* Card 3: PRO */}
                  <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-yellow-500 transition-all flex flex-col">
                      <div className="mb-2 text-yellow-600 dark:text-yellow-500 text-xs font-bold uppercase tracking-wide">Best for Power Users</div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{text.priceCards.pro.title}</h3>
                      <div className="text-4xl font-bold text-slate-900 dark:text-white mb-4">{text.priceCards.pro.price}</div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 italic mb-8 border-b border-slate-100 dark:border-slate-800 pb-8">"{text.priceCards.pro.valueProp}"</p>
                      
                      <button onClick={onStart} className="w-full py-4 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold transition-colors mt-auto">
                          {text.paidPlanBtn}
                      </button>
                  </div>
              </div>
          </div>
      </section>

      {/* 9. FAQ */}
      <section className="py-20 bg-white dark:bg-slate-950">
          <div className="max-w-3xl mx-auto px-6">
              <h2 className="text-2xl font-bold text-center mb-12 text-slate-900 dark:text-white">{text.faqTitle}</h2>
              <div className="space-y-4">
                  {faqs.map((item, i) => (
                      <div 
                        key={i} 
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden cursor-pointer"
                        onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                      >
                          <div className="p-6 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">{item.q}</h4>
                              <span className="text-slate-500 text-xl font-mono">{openFaqIndex === i ? '−' : '+'}</span>
                          </div>
                          {openFaqIndex === i && (
                              <div className="px-6 pb-6 text-slate-600 dark:text-slate-400 text-base leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-4">
                                  {item.a}
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* 10. FINAL CTA */}
      <section className="py-28 text-center relative overflow-hidden bg-slate-900">
          <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/30 to-transparent pointer-events-none"></div>
          <div className="relative z-10 max-w-3xl mx-auto px-6">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight">{text.ctaTitle}</h2>
              <p className="text-slate-400 mb-10 text-lg md:text-xl font-light">{text.ctaSub}</p>
              <button 
                onClick={onStart}
                className="bg-white text-slate-900 px-10 py-5 rounded-full font-bold text-xl hover:bg-cyan-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
              >
                  {text.ctaBtn} &rarr;
              </button>
              <p className="mt-6 text-sm text-slate-500 font-medium">{text.noCard}</p>
          </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-900 pt-16 pb-10 text-sm text-slate-500">
          <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
                  <div className="col-span-2 md:col-span-1">
                      <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center text-white font-bold">SP</div>
                          <span className="text-lg font-bold text-white">SpeakPro</span>
                      </div>
                      <p className="mb-4 text-xs leading-relaxed">
                          SpeakPro - bu sun'iy intellekt yordamida IELTS Speaking imtihoniga tayyorlovchi zamonaviy platforma.
                      </p>
                  </div>
                  <div>
                      <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Product</h4>
                      <ul className="space-y-2">
                          <li><a href="#how" className="hover:text-cyan-400 transition-colors">How it works</a></li>
                          <li><a href="#pricing" className="hover:text-cyan-400 transition-colors">Pricing</a></li>
                          <li><a href="#" onClick={onStart} className="hover:text-cyan-400 transition-colors">Free Trial</a></li>
                      </ul>
                  </div>
                  <div>
                      <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Resources</h4>
                      <ul className="space-y-2">
                          <li><a href="#" className="hover:text-cyan-400 transition-colors">Blog</a></li>
                          <li><a href="#" className="hover:text-cyan-400 transition-colors">IELTS Tips</a></li>
                      </ul>
                  </div>
                  <div>
                      <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-wider">Company</h4>
                      <ul className="space-y-2">
                          <li><a href="#" className="hover:text-cyan-400 transition-colors">About Us</a></li>
                          <li><a href="#" className="hover:text-cyan-400 transition-colors">Contact</a></li>
                      </ul>
                  </div>
              </div>
              <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
                  <p>&copy; {new Date().getFullYear()} SpeakPro AI. All rights reserved.</p>
              </div>
          </div>
      </footer>
    </div>
  );
};

export default Landing;
