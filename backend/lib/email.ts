import nodemailer from "nodemailer";

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  try {
    let transporter: nodemailer.Transporter;

    // Use SMTP configuration if provided in environment variables
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      // Direct Gmail support if GMAIL_USER and GMAIL_PASS / app password provided
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
      });
    } else {
      // Fallback to auto-generated test account (Ethereal Email)
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const mailOptions = {
      from: '"HabitQuest Security" <no-reply@habitquest.com>',
      to,
      subject: "Your HabitQuest Verification Code",
      text: `Welcome back to HabitQuest!\n\nYour 2-Step Verification code is: ${otp}\n\nThis code will expire in 10 minutes.\nIf you did not request this code, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #6d28d9; margin: 0; font-size: 24px;">🏰 HabitQuest</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Parent Portal Security</p>
          </div>
          <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <p style="color: #334155; font-size: 16px; margin-bottom: 16px;">Here is your verification code to access your parent dashboard:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #6d28d9; background-color: #f3e8ff; padding: 12px 24px; border-radius: 8px; display: inline-block; margin: 10px 0; font-family: monospace;">
              ${otp}
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">This code will expire in 10 minutes.</p>
          </div>
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 20px;">
            If you did not attempt to sign in to HabitQuest, please ignore this email or secure your account.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`====================================================`);
    console.log(`[EMAIL SENT] Verification code sent to: ${to}`);
    console.log(`[EMAIL OTP]: ${otp}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[EMAIL PREVIEW URL]: ${previewUrl}`);
    }
    console.log(`====================================================`);
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send OTP email to ${to}:`, error);
    // Even if email sending fails (e.g. no internet/SMTP error), log the OTP so developers are not locked out
    console.log(`[FALLBACK LOG OTP] Code for ${to} is: ${otp}`);
  }
}
