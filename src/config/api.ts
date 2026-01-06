
// Runtime environment detection - Brauzerda aniqlash
const getApiBaseUrl = () => {
  // Agar window obyekti mavjud bo'lmasa (server-side rendering), bo'sh qaytarish
  if (typeof window === 'undefined') return '';

  const hostname = window.location.hostname;

  // 1. Agar sayt LOCALHOST da ochilgan bo'lsa (ishlab chiquvchi rejimi)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log("⚠️ Running in Development Mode (Localhost detected)");
      return 'http://localhost:5000';
  }

  // 2. Agar sayt RENDER yoki boshqa real domenda bo'lsa
  // Bo'sh string ('') qaytaramiz, shunda so'rovlar avtomatik nisbiy bo'ladi.
  // Masalan: fetch('/api/login') -> https://speakpro.onrender.com/api/login
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

// Debugging uchun: Konsolda URLni tekshirish
console.log('🚀 API_BASE_URL:', API_BASE_URL || '(Relative Path /api)');
