import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { GoogleGenAI } from "@google/genai";
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// ESM da __dirname mavjud emas, shuning uchun uni o'zimiz yasaymiz
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Production uchun CORS va Xavfsizlik
app.use(cors());
app.use(express.json());

// 1. Uploads papkasini statik qilish (Rasmlar/Cheklar uchun)
// path.join ishlatish Renderda papkani to'g'ri topish uchun muhim
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 2. React Frontendni ulash (Build qilingan 'dist' papkasi)
// Bu buyruq brauzerga css, js va rasmlarni yuboradi
app.use(express.static(path.join(__dirname, 'dist')));

// Configure Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
    console.error('\x1b[31m%s\x1b[0m', '❌ XATOLIK: .env faylida "MONGODB_URI" topilmadi!');
} else {
    mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    })
        .then(() => console.log('✅ MongoDB connected successfully'))
        .catch(err => console.error('❌ MongoDB connection error:', err.message));
}

// --- NODEMAILER CONFIG ---
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false // Helps avoid self-signed cert errors in some cloud envs
    }
});

// Verify connection configuration on startup
if (process.env.EMAIL_USER) {
    transporter.verify(function (error, success) {
        if (error) {
            console.log('⚠️ Email Server Error:', error.message);
        } else {
            console.log('✅ Email Server is ready to take messages');
        }
    });
}

// --- GOOGLE AUTH CLIENT ---
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- Schemas ---

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    phone: String,
    email: { type: String, unique: true },
    password: String,
    googleId: String,

    tempPassword: { type: String, default: null },
    tempPasswordExpires: { type: Date, default: null },

    // EMAIL VERIFICATION
    verificationToken: { type: String, default: null },

    currentLevel: String,
    targetLevel: String,
    joinedAt: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
    role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // NEW FIELDS FOR TARIFF LOGIC
    balance: { type: Number, default: 0 },
    subscriptionPlan: { type: String, enum: ['free', 'pro', 'unlimited_teacher'], default: 'free' },
    subscriptionExpiresAt: { type: Date },
    examsLeft: { type: Number, default: 0 },

    hasUsedFreeTrial: { type: Boolean, default: false },
    hasPaidHistory: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },

    homework: {
        text: String,
        assignedAt: Date,
        isCompleted: { type: Boolean, default: false }
    }
});

const examSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    overallBand: Number,
    fluencyScore: Number,
    lexicalScore: Number,
    grammarScore: Number,
    pronunciationScore: Number,
    generalAdvice: String,
    weaknessTags: [String],
    weaknessCategories: {
        fluency: String,
        lexical: String,
        grammar: String,
        pronunciation: String
    },
    drills: [{ title: String, instruction: String, example: String }],
    dailyPlan: [{ day: String, focusArea: String, activity: String }],
    isLocked: { type: Boolean, default: false }
});

const feedbackSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    firstName: String,
    type: { type: String, enum: ['exam', 'general'], default: 'general' },
    rating: Number,
    message: String,
    createdAt: { type: Date, default: Date.now }
});

const paymentRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userEmail: String,
    amount: Number,
    note: String,
    receiptPath: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const ExamResult = mongoose.model('ExamResult', examSchema);
const Feedback = mongoose.model('Feedback', feedbackSchema);
const PaymentRequest = mongoose.model('PaymentRequest', paymentRequestSchema);

// --- Middleware ---
const updateLastSeen = async (req, res, next) => {
    const body = req.body || {};
    const query = req.query || {};
    const userId = body.userId || query.userId;
    const email = body.email || query.email;

    if (userId) {
        try { await User.findByIdAndUpdate(userId, { lastSeen: new Date() }); } catch (e) { }
    } else if (email) {
        try { await User.findOneAndUpdate({ email }, { lastSeen: new Date() }); } catch (e) { }
    }
    next();
};

app.use(updateLastSeen);

// --- Routes ---

// 1. SIGNUP (Email/Pass)
app.post('/api/signup', async (req, res) => {
    try {
        const { email, role } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Bu email band." });

        const safeRole = role === 'teacher' ? 'teacher' : 'student';

        const newUser = new User({
            ...req.body,
            role: safeRole,
            balance: 0,
            subscriptionPlan: 'free',
            examsLeft: safeRole === 'teacher' ? 0 : 1,
            hasUsedFreeTrial: false,
            hasPaidHistory: false,
            isEmailVerified: false,
            lastSeen: new Date()
        });
        await newUser.save();

        await sendTelegramMessage(`🚀 SIGNUP: ${req.body.firstName} (${req.body.email}) - Role: ${safeRole}`);
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 2. LOGIN (Email/Pass)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (email === 'Motivationbymirshod@gmail.com' && password === 'Motivationbymirshod') {
            return res.json({
                _id: 'admin',
                firstName: 'Admin',
                lastName: 'User',
                email: email,
                role: 'admin',
                balance: 999999999
            });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Email yoki parol xato." });

        let isPasswordValid = user.password === password;
        if (!isPasswordValid && user.tempPassword && user.tempPassword === password) {
            if (new Date() < user.tempPasswordExpires) {
                isPasswordValid = true;
                user.tempPassword = null;
                user.tempPasswordExpires = null;
                await user.save();
            } else {
                return res.status(400).json({ message: "Vaqtinchalik parol muddati tugagan." });
            }
        }
        if (!isPasswordValid) return res.status(400).json({ message: "Email yoki parol xato." });

        if (user.subscriptionExpiresAt && new Date() > user.subscriptionExpiresAt) {
            user.subscriptionPlan = 'free';
        }

        user.lastSeen = new Date();
        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 3. GOOGLE LOGIN (REAL IMPLEMENTATION)
app.post('/api/auth/google', async (req, res) => {
    try {
        const { token } = req.body;

        // Verify Google Token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        const { email, given_name, family_name, sub } = payload;

        let user = await User.findOne({ email });

        if (!user) {
            // Register new user via Google
            user = new User({
                firstName: given_name,
                lastName: family_name || '',
                email: email,
                googleId: sub,
                password: uuidv4(), // Random password since they use Google
                role: 'student',
                balance: 0,
                subscriptionPlan: 'free',
                examsLeft: 1,
                hasUsedFreeTrial: false,
                isEmailVerified: true, // Google emails are verified by default
                currentLevel: '6.0', // Default
                targetLevel: '7.5',
                joinedAt: new Date(),
                lastSeen: new Date()
            });
            await user.save();
            await sendTelegramMessage(`🚀 GOOGLE SIGNUP: ${email}`);
        } else {
            // Update existing
            user.lastSeen = new Date();
            if (!user.googleId) user.googleId = sub;
            if (!user.isEmailVerified) user.isEmailVerified = true; // Trust Google
            await user.save();
        }

        res.json(user);

    } catch (e) {
        console.error("Google Auth Error:", e);
        res.status(401).json({ message: "Google token noto'g'ri." });
    }
});

// 4. SEND VERIFICATION EMAIL
app.post('/api/user/send-verification-email', async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.isEmailVerified) return res.status(400).json({ message: "Allaqachon tasdiqlangan" });

        // Generate Token
        const token = uuidv4();
        user.verificationToken = token;
        await user.save();

        const verifyLink = `${process.env.BASE_URL || 'https://speakpro-uz.onrender.com'}/api/verify-email?token=${token}`;

        // Send Email
        const mailOptions = {
            from: `"SpeakPro AI" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Emailingizni tasdiqlang',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
                    <h2>SpeakPro AI ga xush kelibsiz!</h2>
                    <p>Bepul imtihonni ishga tushirish uchun pastdagi tugmani bosing:</p>
                    <a href="${verifyLink}" style="background-color: #06b6d4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 10px;">Tasdiqlash</a>
                    <p style="margin-top: 20px; color: #666; font-size: 12px;">Agar siz ro'yxatdan o'tmagan bo'lsangiz, bu xabarni e'tiborsiz qoldiring.</p>
                </div>
            `
        };

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail(mailOptions);
            res.json({ success: true, message: "Email yuborildi" });
        } else {
            console.log("⚠️ SMTP sozlanmagan. Link terminalda:", verifyLink);
            res.json({ success: true, message: "Email yuborildi (Dev mode: Check server logs)" });
        }

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: e.message });
    }
});

// 5. HANDLE VERIFICATION CLICK (GET request from Email)
app.get('/api/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.send("Xato havola");

        const user = await User.findOne({ verificationToken: token });
        if (!user) return res.send("Havola eskirgan yoki noto'g'ri.");

        user.isEmailVerified = true;
        user.verificationToken = null; // Clear token
        await user.save();

        res.send(`
            <html>
                <body style="background-color: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
                    <div style="text-align: center;">
                        <h1 style="color: #22d3ee;">Email Tasdiqlandi! ✅</h1>
                        <p>Endi SpeakPro saytiga qaytib, bepul imtihonni boshlashingiz mumkin.</p>
                        <p style="font-size: 12px; color: #94a3b8;">(Sahifani yangilang)</p>
                        <script>
                           setTimeout(() => { window.close(); }, 3000);
                        </script>
                    </div>
                </body>
            </html>
        `);

    } catch (e) {
        res.status(500).send("Server xatosi");
    }
});

// 6. FORGOT PASSWORD (Send Temp Pass)
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "Bunday email topilmadi" });

        const tempPass = Math.random().toString(36).slice(-8);
        user.tempPassword = tempPass;
        user.tempPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
        await user.save();

        const mailOptions = {
            from: `"SpeakPro Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Parolni tiklash',
            text: `Sizning vaqtinchalik parolingiz: ${tempPass}\nBu parol 1 soat davomida amal qiladi.`
        };

        if (process.env.EMAIL_USER) {
            await transporter.sendMail(mailOptions);
        } else {
            console.log("Dev Temp Pass:", tempPass);
        }

        res.json({ success: true, message: `${email} ga vaqtinchalik parol yuborildi.` });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

// --- UPDATED PURCHASE LOGIC (Supports Self & Teacher Tariffs) ---
app.post('/api/wallet/purchase-plan', async (req, res) => {
    try {
        const { userId, planId, resultId } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        let cost = 0;
        let creditsToAdd = 0;
        let packageName = "";
        let isPro = false;
        let isUnlimitedTeacher = false;

        switch (planId) {
            // SELF TARIFFS
            case 'unlock_result': cost = 3000; packageName = "Unlock Result"; break;
            case 'one_exam': cost = 9000; creditsToAdd = 1; packageName = "1 Exam"; break;
            case '5_exams': cost = 39000; creditsToAdd = 5; packageName = "5 Exams"; break;
            case 'pro_sub': cost = 49000; creditsToAdd = 20; isPro = true; packageName = "PRO (20 Exams)"; break;

            // TEACHER TARIFFS
            case 'teacher_starter':
                cost = 150000;
                creditsToAdd = 20;
                packageName = "Teacher Starter (20)";
                break;
            case 'teacher_active':
                cost = 350000;
                creditsToAdd = 50;
                packageName = "Teacher Active (50)";
                break;
            case 'teacher_pro':
                cost = 600000;
                creditsToAdd = 100;
                packageName = "Teacher Pro (100)";
                break;
            case 'teacher_unlimited':
                cost = 2000000;
                isUnlimitedTeacher = true;
                packageName = "Teacher Unlimited (SaaS)";
                break;

            default: return res.status(400).json({ message: "Invalid plan" });
        }

        if (user.balance < cost) {
            return res.status(400).json({ message: "Balans yetarli emas", success: false, required: cost });
        }

        user.balance -= cost;

        if (planId === 'unlock_result' && resultId) {
            await ExamResult.findByIdAndUpdate(resultId, { isLocked: false });
        } else {
            if (isUnlimitedTeacher) {
                user.subscriptionPlan = 'unlimited_teacher';
                const expires = new Date();
                expires.setDate(expires.getDate() + 30);
                user.subscriptionExpiresAt = expires;
                user.examsLeft = 10000;
            } else {
                user.examsLeft = (user.examsLeft || 0) + creditsToAdd;

                if (isPro) {
                    user.subscriptionPlan = 'pro';
                    const expires = new Date();
                    expires.setDate(expires.getDate() + 30);
                    user.subscriptionExpiresAt = expires;
                }
            }
            user.hasPaidHistory = true;
        }

        await user.save();
        await sendTelegramMessage(`✅ XARID: ${user.email} | ${packageName} | -${cost}`);

        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});

app.get('/api/user/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) return res.status(404).json({ message: "User not found" });
        user.lastSeen = new Date();
        await user.save();
        res.json(user);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/results', async (req, res) => {
    try {
        const { email, result } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        await ExamResult.deleteMany({ userId: user._id });

        let shouldLock = false;
        const isB2B = !!user.teacherId;
        const isPro = user.subscriptionPlan === 'pro' || user.subscriptionPlan === 'unlimited_teacher';
        const hasPaid = user.hasPaidHistory;

        if (!isB2B && !isPro && !hasPaid) {
            shouldLock = true;
            user.hasUsedFreeTrial = true;
        }

        if (user.examsLeft > 0) {
            user.examsLeft -= 1;
        } else {
            if (!isPro && !hasPaid && !user.hasUsedFreeTrial) {
                // Free trial logic
            } else {
                return res.status(403).json({ message: "No credits left" });
            }
        }

        user.lastSeen = new Date();
        await user.save();

        const newExam = new ExamResult({
            userId: user._id,
            overallBand: result.overallBand,
            fluencyScore: result.fluency.score,
            lexicalScore: result.lexical.score,
            grammarScore: result.grammar.score,
            pronunciationScore: result.pronunciation.score,
            generalAdvice: result.generalAdvice,
            weaknessTags: result.weaknessTags,
            weaknessCategories: result.weaknessCategories,
            drills: result.drills,
            dailyPlan: result.dailyPlan,
            isLocked: shouldLock
        });

        await newExam.save();
        res.status(201).json(newExam);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Failed to save result" });
    }
});

app.get('/api/history', async (req, res) => {
    try {
        const { email } = req.query;
        const user = await User.findOne({ email });
        if (!user) return res.json([]);
        const history = await ExamResult.find({ userId: user._id }).sort({ date: -1 }).limit(1);
        res.json(history);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// Admin & Teacher Routes
app.get('/api/admin/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const users = await User.find().sort({ joinedAt: -1 }).skip(skip).limit(limit);
        const enrichedUsers = await Promise.all(users.map(async u => {
            const lastExam = await ExamResult.findOne({ userId: u._id }).sort({ date: -1 });
            const teacher = u.teacherId ? await User.findById(u.teacherId) : null;
            return { ...u.toObject(), lastExam, teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : null };
        }));
        const total = await User.countDocuments();
        res.json({ users: enrichedUsers, totalPages: Math.ceil(total / limit), currentPage: page });
    } catch (e) { res.status(500).json({ message: e.message }); }
});
app.get('/api/admin/payments', async (req, res) => { try { const requests = await PaymentRequest.find({ status: 'pending' }).sort({ date: -1 }); res.json(requests); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/admin/approve-payment', async (req, res) => { try { const { requestId } = req.body; const reqDoc = await PaymentRequest.findById(requestId); if (!reqDoc || reqDoc.status !== 'pending') return res.status(400).json({ message: "Error" }); const user = await User.findById(reqDoc.userId); if (user) { user.balance = (user.balance || 0) + reqDoc.amount; await user.save(); } reqDoc.status = 'approved'; await reqDoc.save(); res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/admin/reject-payment', async (req, res) => { try { await PaymentRequest.findByIdAndUpdate(req.body.requestId, { status: 'rejected' }); res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }); } });
app.delete('/api/admin/users/:id', async (req, res) => { try { await User.findByIdAndDelete(req.params.id); await ExamResult.deleteMany({ userId: req.params.id }); res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }); } });
app.get('/api/admin/stats', async (req, res) => { try { const totalUsers = await User.countDocuments(); const proUsers = await User.countDocuments({ subscriptionPlan: 'pro' }); const dailyActive = await User.countDocuments({ lastSeen: { $gte: new Date(Date.now() - 86400000) } }); res.json({ totalUsers, proUsers, dailyActive, avgScore: 6.5, activeHours: [] }); } catch (e) { res.status(500).json({ message: e.message }); } });
app.get('/api/admin/feedbacks', async (req, res) => { try { const items = await Feedback.find().sort({ createdAt: -1 }).limit(50); res.json(items); } catch (e) { res.status(500).json({ message: e.message }); } });
app.delete('/api/admin/feedbacks/:id', async (req, res) => { try { await Feedback.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/admin/update-user-wallet', async (req, res) => { try { const { userId, amount, plan, exams } = req.body; const user = await User.findById(userId); if (!user) return res.status(404).json({ message: "User not found" }); if (amount) user.balance = (user.balance || 0) + Number(amount); if (plan) user.subscriptionPlan = plan; if (exams !== undefined && exams !== '') user.examsLeft = Number(exams); await user.save(); res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }); } });
app.put('/api/admin/change-password', async (req, res) => { try { await User.findByIdAndUpdate(req.body.userId, { password: req.body.newPassword }); res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }); } });

// --- TEACHER ROUTES ---

app.get('/api/teacher/students', async (req, res) => {
    try {
        const students = await User.find({ teacherId: req.query.teacherId });
        const data = await Promise.all(students.map(async s => {
            const lastExam = await ExamResult.findOne({ userId: s._id }).sort({ date: -1 });
            return { ...s.toObject(), lastExam };
        }));
        res.json(data);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/teacher/create-student', async (req, res) => {
    try {
        const { firstName, lastName, email, password, teacherId } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ message: "Email already exists" });

        const newStudent = new User({
            firstName,
            lastName,
            email,
            password,
            teacherId,
            role: 'student',
            balance: 0,
            subscriptionPlan: 'free',
            examsLeft: 0,
            hasPaidHistory: false,
            currentLevel: '5.0',
            targetLevel: '6.5'
        });
        await newStudent.save(); res.json(newStudent);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/teacher/distribute-credit', async (req, res) => {
    try {
        const { teacherId, studentId } = req.body;
        const teacher = await User.findById(teacherId);
        const student = await User.findById(studentId);

        let isUnlimited = teacher.subscriptionPlan === 'unlimited_teacher';
        if (isUnlimited && teacher.subscriptionExpiresAt && new Date() > teacher.subscriptionExpiresAt) {
            isUnlimited = false;
            teacher.subscriptionPlan = 'free';
            await teacher.save();
        }

        if (!isUnlimited && (!teacher.examsLeft || teacher.examsLeft <= 0)) {
            return res.status(400).json({ message: "Sizda kreditlar qolmagan. Iltimos paket sotib oling." });
        }

        if (!isUnlimited) {
            teacher.examsLeft -= 1;
            await teacher.save();
        }

        student.examsLeft = (student.examsLeft || 0) + 1;
        student.hasPaidHistory = true;
        await student.save();

        res.json({ success: true, teacherRemaining: teacher.examsLeft, studentCredits: student.examsLeft });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/teacher/assign-homework', async (req, res) => {
    try {
        const { studentId, text } = req.body;
        await User.findByIdAndUpdate(studentId, { homework: { text, assignedAt: new Date(), isCompleted: false } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/feedback', async (req, res) => { try { const fb = new Feedback(req.body); await fb.save(); res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/user/heartbeat', async (req, res) => { try { await User.findOneAndUpdate({ email: req.body.email }, { lastSeen: new Date() }); res.json({ success: true }); } catch (e) { res.status(500).json({ message: e.message }); } });
app.post('/api/wallet/request-manual-payment', upload.single('receipt'), async (req, res) => {
    try {
        const { userId, amount, note } = req.body;
        const user = await User.findById(userId);
        const request = new PaymentRequest({ userId, userEmail: user.email, amount: Number(amount), note, receiptPath: req.file ? req.file.path : null, status: 'pending' });
        await request.save();
        await sendTelegramMessage(`💸 PAY REQUEST: ${user.email} - ${amount}`);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

async function sendTelegramMessage(text) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    try { await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, { chat_id: chatId, text }); } catch (e) { }
}

// --- CATCH-ALL ROUTE (MUST BE LAST) ---
// Barcha boshqa so'rovlarni React appga yo'naltirish
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
