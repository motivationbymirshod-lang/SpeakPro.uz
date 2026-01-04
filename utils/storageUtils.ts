import { UserProfile, ExamResult } from "../types";

const USERS_KEY = 'ielts_ai_users';
const CURRENT_USER_KEY = 'ielts_ai_current_user';
const EXAM_HISTORY_KEY = 'ielts_ai_exam_history';

export const saveUser = (user: UserProfile) => {
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.email === user.email);
  
  if (existingIndex >= 0) {
    users[existingIndex] = { ...users[existingIndex], ...user };
  } else {
    users.push({ ...user, id: Date.now().toString(), joinedAt: new Date().toISOString() });
  }
  
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

export const getUsers = (): UserProfile[] => {
  const users = localStorage.getItem(USERS_KEY);
  return users ? JSON.parse(users) : [];
};

export const getCurrentUser = (): UserProfile | null => {
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const logoutUser = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const findUser = (email: string): UserProfile | undefined => {
  const users = getUsers();
  return users.find(u => u.email === email);
};

// --- EXAM HISTORY ---

export const saveExamResult = (email: string, result: ExamResult) => {
    const history = getExamHistory();
    const entry = { email, result, date: new Date().toISOString() };
    history.push(entry);
    localStorage.setItem(EXAM_HISTORY_KEY, JSON.stringify(history));
};

export const getExamHistory = (): any[] => {
    const history = localStorage.getItem(EXAM_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
};

export const getUserHistory = (email: string): ExamResult[] => {
    const allHistory = getExamHistory();
    return allHistory
        .filter(h => h.email === email)
        .map(h => ({ ...h.result, date: h.date })) // Flatten structure
        .slice(-10); // Return last 10 exams
};