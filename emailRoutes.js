
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export const setupEmailRoutes = (app, User) => {

    // --- BREVO HTTP API HELPER (Non-blocking) ---
    const sendEmailBackground = async (toEmail, subject, htmlContent) => {
        const apiKey = process.env.BREVO_API_KEY;
        const senderEmail = process.env.EMAIL_USER;

        if (!apiKey || !senderEmail) {
            console.warn("⚠️ Email yuborilmadi: .env da BREVO_API_KEY yoki EMAIL_USER yo'q.");
            return;
        }

        const payload = {
            sender: { email: senderEmail, name: "SpeakPro AI" },
            to: [{ email: toEmail }],
            subject: subject,
            htmlContent: htmlContent
        };

        // Orqa fonda yuborish (Await ishlatmaymiz, lekin xatoni ushlaymiz)
        axios.post('https://api.brevo.com/v3/smtp/email', payload, {
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            },
            timeout: 10000 // 10 soniya timeout
        })
        .then(response => {
            console.log(`✅ Email sent via HTTP API to: ${toEmail} | ID: ${response.data.messageId}`);
        })
        .catch(error => {
            console.error("❌ Email API Error:", error.response ? error.response.data : error.message);
        });
    };

    // 1. SEND VERIFICATION EMAIL
    app.post('/api/user/send-verification-email', async (req, res) => {
        try {
            const { userId } = req.body;
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ message: "User not found" });

            if (user.isEmailVerified) return res.status(400).json({ message: "Allaqachon tasdiqlangan" });

            // Generate Token & Save
            const token = uuidv4();
            user.verificationToken = token;
            await user.save();

            // Javobni darhol qaytaramiz (UI kutib qolmasligi uchun)
            res.json({ success: true, message: "Email jarayoni boshlandi" });

            // Emailni orqa fonda yuboramiz
            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            const host = req.headers.host;
            const currentBaseUrl = process.env.BASE_URL || `${protocol}://${host}`;
            const verifyLink = `${currentBaseUrl}/api/verify-email?token=${token}`;

            const htmlContent = `
                <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9f9f9;">
                    <div style="text-align: center; padding-bottom: 20px;">
                        <h2 style="color: #06b6d4; margin: 0;">SpeakPro AI</h2>
                    </div>
                    <div style="background-color: white; padding: 30px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <h3 style="color: #333; margin-top: 0;">Xush kelibsiz!</h3>
                        <p style="color: #555; font-size: 16px; line-height: 1.5;">Bepul IELTS Speaking imtihonini boshlash uchun emailingizni tasdiqlang.</p>
                        
                        <a href="${verifyLink}" style="display: inline-block; background-color: #06b6d4; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; box-shadow: 0 4px 6px rgba(6, 182, 212, 0.2);">Tasdiqlash</a>
                        
                        <p style="margin-top: 30px; color: #999; font-size: 12px;">Agar siz ro'yxatdan o'tmagan bo'lsangiz, bu xabarni o'chirib yuboring.</p>
                    </div>
                </div>
            `;

            sendEmailBackground(user.email, 'Emailingizni tasdiqlang', htmlContent);

        } catch (e) {
            console.error("Verification Route Error:", e);
            // Agar javob yuborilmagan bo'lsa
            if (!res.headersSent) res.status(500).json({ message: "Server xatosi" });
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
                <body style="background-color: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif;">
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 60px; margin-bottom: 20px;">✅</div>
                        <h1 style="color: #22d3ee; margin-bottom: 10px;">Email Tasdiqlandi!</h1>
                        <p style="color: #cbd5e1; max-width: 400px; margin: 0 auto 30px;">Endi SpeakPro saytiga qaytib, bepul imtihonni boshlashingiz mumkin.</p>
                        <p style="font-size: 12px; color: #64748b;">(Bu sahifani yopishingiz mumkin)</p>
                        <script>
                           // 3 soniyadan keyin oynani yopishga urinib ko'ramiz
                           setTimeout(() => { window.close(); }, 5000);
                        </script>
                    </div>
                </body>
            </html>
        `);

        } catch (e) {
            console.error("Verify Email Route Error:", e);
            res.status(500).send("Server xatosi");
        }
    });

    // 3. FORGOT PASSWORD (Send Temp Pass)
    app.post('/api/forgot-password', async (req, res) => {
        try {
            const { email } = req.body;
            const user = await User.findOne({ email });
            if (!user) return res.status(404).json({ success: false, message: "Bunday email topilmadi" });

            // Generate Temp Password
            const tempPass = Math.random().toString(36).slice(-8);
            user.tempPassword = tempPass;
            user.tempPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
            await user.save();

            // Javobni darhol qaytaramiz
            res.json({ success: true, message: `${email} ga vaqtinchalik parol yuborilmoqda.` });

            // Emailni orqa fonda yuboramiz
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #333;">Parolni tiklash</h2>
                    <p>Sizning vaqtinchalik parolingiz:</p>
                    <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 2px; color: #06b6d4;">
                        ${tempPass}
                    </div>
                    <p style="color: #666; font-size: 13px; margin-top: 20px;">Bu parol 1 soat davomida amal qiladi. Tizimga kirgach, parolni o'zgartirishni unutmang.</p>
                </div>
            `;

            sendEmailBackground(email, 'Parolni tiklash', htmlContent);

        } catch (e) {
            console.error("Forgot Pass Route Error:", e);
            if (!res.headersSent) res.status(500).json({ message: "Server xatosi" });
        }
    });
};
