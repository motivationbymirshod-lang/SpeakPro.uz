
// Bu fayl server manzilini aniqlaydi.
const hostname = window.location.hostname;
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

// MANTIQ:
// 1. Agar sayt LOCALHOST da ochilgan bo'lsa -> http://localhost:5000
// 2. Agar sayt RENDER (yoki boshqa domen) da ochilgan bo'lsa -> '' (bo'sh string)
//    Bo'sh string ishlatilganda brauzer avtomatik ravishda so'rovni joriy domenga yuboradi.
//    Masalan: https://speakpro.onrender.com/api/...

export const API_BASE_URL = isLocalhost 
  ? ((import.meta as any).env.VITE_API_URL || 'http://localhost:5000') 
  : '';
