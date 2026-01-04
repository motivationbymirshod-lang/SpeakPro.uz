

export const TEACHER_TARIFFS = {
  STARTER: {
    id: 'teacher_starter',
    price: 150000,
    credits: 20,
    title: "Starter Teacher",
    description: "Kichik guruhlar yoki individual repetitorlar uchun.",
    costPerExam: 7500,
    savings: "17%",
    color: "from-blue-500 to-indigo-600",
    isPopular: false
  },
  ACTIVE: {
    id: 'teacher_active',
    price: 350000,
    credits: 50,
    title: "Active Center",
    description: "2-3 ta guruh o'qitadiganlar uchun ideal.",
    costPerExam: 7000,
    savings: "22%",
    color: "from-cyan-500 to-blue-600",
    isPopular: true
  },
  PRO: {
    id: 'teacher_pro',
    price: 600000,
    credits: 100,
    title: "Pro Center",
    description: "Katta o'quv markazlari uchun ulgurji narx.",
    costPerExam: 6000,
    savings: "33%",
    color: "from-purple-500 to-pink-600",
    isPopular: false
  },
  UNLIMITED: {
    id: 'teacher_unlimited',
    price: 2000000,
    credits: 9999, // Cheksiz deb ko'rsatiladi
    title: "Unlimited (SaaS)",
    description: "Cheklovsiz imtihonlar. 500+ o'quvchisi borlar uchun.",
    costPerExam: 0,
    savings: "MAX",
    color: "from-slate-700 to-black",
    isPopular: false
  }
};