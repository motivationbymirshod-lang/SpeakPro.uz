
export interface UserProfile {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password?: string;
  currentLevel: string;
  targetLevel: string;
  id?: string;
  _id?: string;
  joinedAt?: string;
  lastSeen?: string; 
  
  // Security & Verification
  isEmailVerified?: boolean;

  // Monetization Fields
  balance: number;
  subscriptionPlan: 'free' | 'pro' | 'unlimited_teacher';
  subscriptionExpiresAt?: string;
  
  examsLeft?: number;
  hasPaidHistory?: boolean;
  hasUsedFreeTrial?: boolean; 
  
  // B2B Field
  role: 'student' | 'teacher' | 'admin';
  teacherName?: string; 
  teacherId?: string;
  homework?: {
      text: string;
      assignedAt: string;
      isCompleted: boolean;
  };

  // NEW: GROWTH FEATURES
  dictionary?: DictionaryItem[];
  roadmapProgress?: number; // 0-100
}

export interface DictionaryItem {
    word: string;
    definition: string;
    example: string;
    addedAt: string;
    masteryLevel: number; // 1-5 (Spaced Repetition uchun)
}

export interface TeacherStudent {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    subscriptionPlan: string;
    subscriptionExpiresAt?: string;
    examsLeft?: number;
    lastExam?: {
        date: string;
        overallBand: number;
        fluencyScore?: number;
        lexicalScore?: number;
        grammarScore?: number;
        pronunciationScore?: number;
        weaknessTags?: string[];
        scores?: {
            f: number;
            l: number;
            g: number;
            p: number;
        };
        weaknesses?: string[];
    };
}

export interface FeedbackSection {
  score: number;
  comments: string;
}

export interface Drill {
  title: string;
  instruction: string;
  example: string;
}

export interface PlanDay {
  day: string;
  focusArea: string;
  activity: string;
}

export interface ExamResult {
  _id?: string; 
  date?: string;
  overallBand: number;
  fluency: FeedbackSection;
  lexical: FeedbackSection;
  grammar: FeedbackSection;
  pronunciation: FeedbackSection;
  generalAdvice: string;
  
  // NEW: COACHING FEATURES
  band9Response?: string; // AI generated perfect answer
  coachTip?: string; // Short actionable tip (e.g. "Don't use 'very good', use 'splendid'")
  
  weaknessTags: string[]; 
  drills: Drill[];
  dailyPlan: PlanDay[];
  isLocked?: boolean; 
}

export interface FeedbackItem {
    _id: string;
    userId: string;
    email: string;
    firstName: string;
    type: 'exam' | 'general';
    rating?: number; 
    message: string;
    createdAt: string;
}

export interface PaymentRequest {
    _id: string;
    userId: string;
    userEmail: string;
    amount: number;
    type?: 'topup' | 'unlock_result' | 'buy_plan';
    note?: string;
    status: 'pending' | 'approved' | 'rejected';
    date: string;
}

export enum AppState {
  LANDING = 'LANDING',
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  EXAM = 'EXAM',
  RESULTS = 'RESULTS',
  ADMIN = 'ADMIN'
}
