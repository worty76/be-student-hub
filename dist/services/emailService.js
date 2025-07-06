"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const form_data_1 = __importDefault(require("form-data"));
const mailgun_js_1 = __importDefault(require("mailgun.js"));
class EmailService {
    constructor() {
        // Initialize Mailgun client
        const mailgun = new mailgun_js_1.default(form_data_1.default);
        this.mg = mailgun.client({
            username: "api",
            key: process.env.MAILGUN_API_KEY || "",
        });
        this.domain = process.env.MAILGUN_DOMAIN || "";
    }
    async sendPasswordResetEmail(user, resetToken) {
        const resetURL = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`;
        const emailData = {
            from: `Student Hub <postmaster@${this.domain}>`,
            to: [user.email],
            subject: "Đặt lại mật khẩu - Student Hub",
            html: this.generatePasswordResetHTML(user.name, resetURL),
            text: `Xin chào ${user.name}, vui lòng truy cập liên kết sau để đặt lại mật khẩu: ${resetURL}`,
        };
        try {
            const response = await this.mg.messages.create(this.domain, emailData);
            console.log("✅ Password reset email sent successfully to:", user.email);
            console.log("📧 Message ID:", response.id);
        }
        catch (error) {
            console.error("❌ Error sending password reset email:", error);
            throw new Error("Failed to send password reset email");
        }
    }
    async sendWelcomeEmail(user) {
        const emailData = {
            from: `Student Hub <postmaster@${this.domain}>`,
            to: [user.email],
            subject: "Chào mừng bạn đến với Student Hub! 🎓",
            html: this.generateWelcomeHTML(user.name),
            text: `Chào mừng ${user.name} đến với Student Hub! Cảm ơn bạn đã đăng ký tài khoản.`,
        };
        try {
            const response = await this.mg.messages.create(this.domain, emailData);
            console.log("✅ Welcome email sent successfully to:", user.email);
            console.log("📧 Message ID:", response.id);
        }
        catch (error) {
            console.error("❌ Error sending welcome email:", error);
            // Don't throw error for welcome emails to avoid registration failure
        }
    }
    async sendTestEmail(to) {
        const emailData = {
            from: `Student Hub Test <postmaster@${this.domain}>`,
            to: [to],
            subject: "Test Email - Student Hub",
            html: `
        <h1>🎉 Email Test Successful!</h1>
        <p>If you receive this email, your Mailgun configuration is working correctly.</p>
        <p><strong>Domain:</strong> ${this.domain}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>API Key:</strong> ...${process.env.MAILGUN_API_KEY?.slice(-8) || "not-set"}</p>
      `,
            text: `Email test successful! Your Mailgun configuration is working correctly. Domain: ${this.domain}, Time: ${new Date().toLocaleString()}`,
        };
        try {
            const response = await this.mg.messages.create(this.domain, emailData);
            console.log("✅ Test email sent successfully to:", to);
            console.log("📧 Message ID:", response.id);
            return response;
        }
        catch (error) {
            console.error("❌ Error sending test email:", error);
            throw error;
        }
    }
    generatePasswordResetHTML(userName, resetURL) {
        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Đặt lại mật khẩu</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            @media only screen and (max-width: 600px) {
                .container { padding: 10px; }
                .header, .content { padding: 20px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Đặt lại mật khẩu</h1>
                <p>Student Hub - Nền tảng học tập sinh viên</p>
            </div>
            
            <div class="content">
                <h2>Xin chào ${userName}!</h2>
                
                <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản Student Hub của bạn.</p>
                
                <p>Để đặt lại mật khẩu, vui lòng nhấn vào nút bên dưới:</p>
                
                <div style="text-align: center;">
                    <a href="${resetURL}" class="button">Đặt lại mật khẩu</a>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Lưu ý quan trọng:</strong>
                    <ul>
                        <li>Liên kết này chỉ có hiệu lực trong <strong>1 giờ</strong></li>
                        <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
                        <li>Không chia sẻ liên kết này với ai khác</li>
                    </ul>
                </div>
                
                <p>Nếu nút không hoạt động, bạn có thể sao chép và dán liên kết sau vào trình duyệt:</p>
                <p style="word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px; font-family: monospace;">
                    ${resetURL}
                </p>
                
                <p>Trân trọng,<br>
                <strong>Đội ngũ Student Hub</strong></p>
            </div>
            
            <div class="footer">
                <p>© 2024 Student Hub. Tất cả quyền được bảo lưu.</p>
                <p>Đây là email tự động, vui lòng không trả lời email này.</p>
            </div>
        </div>
    </body>
    </html>
    `;
    }
    generateWelcomeHTML(userName) {
        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Chào mừng đến với Student Hub</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #4facfe; }
            @media only screen and (max-width: 600px) {
                .container { padding: 10px; }
                .header, .content { padding: 20px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Chào mừng đến với Student Hub!</h1>
                <p>Nền tảng học tập và kết nối sinh viên</p>
            </div>
            
            <div class="content">
                <h2>Xin chào ${userName}!</h2>
                
                <p>Chúc mừng bạn đã tham gia cộng đồng Student Hub! Chúng tôi rất vui được chào đón bạn.</p>
                
                <h3>🚀 Điều bạn có thể làm trên Student Hub:</h3>
                
                <div class="feature">
                    <h4>📚 Mua bán sách và tài liệu</h4>
                    <p>Trao đổi sách cũ, tài liệu học tập với sinh viên khác</p>
                </div>
                
                <div class="feature">
                    <h4>💬 Trò chuyện và kết nối</h4>
                    <p>Tìm bạn học, thảo luận bài tập và chia sẻ kinh nghiệm</p>
                </div>
                
                <div class="feature">
                    <h4>⭐ Đánh giá và phản hồi</h4>
                    <p>Xây dựng uy tín thông qua hệ thống đánh giá minh bạch</p>
                </div>
                
                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}" class="button">
                        Khám phá ngay
                    </a>
                </div>
                
                <p>Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi!</p>
                
                <p>Chúc bạn có trải nghiệm tuyệt vời!<br>
                <strong>Đội ngũ Student Hub</strong></p>
            </div>
            
            <div class="footer">
                <p>© 2024 Student Hub. Tất cả quyền được bảo lưu.</p>
            </div>
        </div>
    </body>
    </html>
    `;
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
