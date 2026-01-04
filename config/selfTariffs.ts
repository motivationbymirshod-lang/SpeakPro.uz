
export const SELF_TARIFFS = {
  // 1. BEPUL SINOV (FREE TRIAL)
  FREE_TRIAL: {
    id: 'free_trial',
    price: 0,
    credits: 1,
    requiresEmailVerification: true,
    features: {
      isResultLocked: true, // Natija qulflangan bo'ladi (faqat Overall ko'rinadi)
      showFullHistory: false
    }
  },

  // 2. NATIJANI OCHISH (UNLOCK RESULT)
  UNLOCK_RESULT: {
    id: 'unlock_result',
    price: 3000,
    credits: 0,
    title: "Natijani Ochish",
    description: "Yopiq imtihon tahlilini to'liq ko'rish (Fluency, Grammar, xatolar...)",
    isPlan: false
  },

  // 3. YAKKALIK IMTIHON (1 EXAM)
  ONE_EXAM: {
    id: 'one_exam',
    price: 9000,
    credits: 1,
    title: "1 ta Imtihon",
    description: "To'liq tahlil va mashqlar bilan.",
    features: {
      isResultLocked: false,
      showFullHistory: true // Oxirgi 1 ta imtihon to'liq ko'rinadi
    },
    isPlan: true
  },

  // 4. 5 TA IMTIHON PAKETI (STANDARD)
  FIVE_EXAMS: {
    id: '5_exams',
    price: 39000,
    credits: 5,
    title: "5 ta Imtihon Paketi",
    description: "Donasi 7,800 so'mdan tushadi. Eng tejamkor.",
    features: {
      isResultLocked: false,
      showFullHistory: true
    },
    isPlan: true,
    isPopular: true
  },

  // 5. PRO OBUNA (20 Exams / Month)
  PRO_SUBSCRIPTION: {
    id: 'pro_sub',
    price: 49000,
    credits: 20, // LIMIT: 20 exams per month
    durationDays: 30,
    title: "PRO Obuna (20 ta)",
    description: "Oyiga 20 ta imtihon. Intensiv tayyorgarlik uchun.",
    features: {
      isResultLocked: false,
      showFullHistory: true
    },
    isPlan: true
  }
};
