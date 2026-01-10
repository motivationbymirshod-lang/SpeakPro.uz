
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

export const setupEmailRoutes = (app, User) => {
    // --- NODEMAILER CONFIG (BREVO SMTP) ---
    // Render va boshqa cloudlar 587 portni bloklaydi. 
    // Shuning uchun 465 (SSL) portidan foydalanamiz.
    const transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 465, // 587 o'rniga 465
        secure: true, // 465 uchun true bo'lishi shart
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            // Self-signed sertifikatlar bilan bog'liq muammolarni oldini olish
            rejectUnauthorized: false 
        },
        connectionTimeout: 10000, // 10 soniya kutish
    });

    // Verify connection configuration (Non-blocking)
    if (process.env.EMAIL_USER) {
        transporter.verify(function (error, success) {
            if (error) {
                console.error('❌ Email Server Error:', error);
            } else {
                console.log('✅ Email Server is ready (Brevo SMTP via Port 465)');
            }
        });
    }

    // 1. SEND VERIFICATION EMAIL
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

            // DETERMINE BASE URL (Localhost vs Production)
            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            const host = req.headers.host;
            const currentBaseUrl = process.env.BASE_URL || `${protocol}://${host}`;

            const verifyLink = `${currentBaseUrl}/api/verify-email?token=${token}`;

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
            console.error("Email send error:", e);
            res.status(500).json({ message: e.message });
        }
    });

    // 2. HANDLE VERIFICATION CLICK (GET request from Email)
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
            console.error(e);
            res.status(500).send("Server xatosi");
        }
    });

    // 3. FORGOT PASSWORD (Send Temp Pass)
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
            console.error("Forgot pass error:", e);
            res.status(500).json({ message: e.message });
        }
    });
};
