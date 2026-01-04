
// Bu fayl server manzilini avtomatik aniqlaydi.
// 1. Agar .env faylida VITE_API_URL bo'lsa, o'shani oladi (Split deployment uchun).
// 2. Agar Production rejimi bo'lsa (Render), bo'sh qoldiradi (Nisbiy manzil: /api/...).
// 3. Lokal rejimda esa http://localhost:5000 ishlatadi.

export const API_BASE_URL = (import.meta as any).env.VITE_API_URL || ((import.meta as any).env.PROD ? '' : 'http://localhost:5000');
