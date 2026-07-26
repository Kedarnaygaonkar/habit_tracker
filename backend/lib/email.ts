import nodemailer from "nodemailer";

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  try {
    const htmlContent = `
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
    `;

    // 1. Use Resend API if configured (Best for Vercel / Serverless environments)
    if (process.env.RESEND_API_KEY) {
      console.log(`[RESEND] Attempting to send OTP email to ${to} via Resend HTTP API...`);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "HabitQuest <onboarding@resend.dev>",
          to: [to],
          subject: "Your HabitQuest Verification Code",
          html: htmlContent,
        }),
      });
      const data: any = await res.json();
      if (!res.ok) {
        console.error(`[RESEND EMAIL ERROR] Failed to send to ${to}: ${data?.message || JSON.stringify(data)}`);
        console.log(`[FALLBACK LOG OTP] Code for ${to} is: ${otp}`);
        return;
      } else {
        console.log(`[RESEND EMAIL SENT] Verification code sent to ${to} (ID: ${data?.id})`);
        console.log(`[EMAIL OTP]: ${otp}`);
        return;
      }
    }

    // 2. Use Brevo (formerly Sendinblue) HTTP API if configured (Allows sending to ANY recipient without domain verification)
    if (process.env.BREVO_API_KEY) {
      console.log(`[BREVO] Attempting to send OTP email to ${to} via Brevo HTTP API...`);
      const senderEmail = process.env.BREVO_FROM || process.env.GMAIL_USER || "no-reply@habitquest.com";
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY.trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "HabitQuest Security", email: senderEmail },
          to: [{ email: to }],
          subject: "Your HabitQuest Verification Code",
          htmlContent: htmlContent,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown Brevo API error");
        console.error(`[BREVO EMAIL ERROR] Failed to send to ${to}: ${errText}`);
        console.log(`[FALLBACK LOG OTP] Code for ${to} is: ${otp}`);
        return;
      } else {
        const data: any = await res.json().catch(() => ({}));
        console.log(`[BREVO EMAIL SENT] Verification code sent to ${to} (ID: ${data?.messageId || "success"})`);
        console.log(`[EMAIL OTP]: ${otp}`);
        return;
      }
    }

    // 3. Use Twilio SendGrid HTTP API if configured (Allows sending to ANY recipient without domain verification)
    if (process.env.SENDGRID_API_KEY) {
      console.log(`[SENDGRID] Attempting to send OTP email to ${to} via SendGrid HTTP API...`);
      const senderEmail = process.env.SENDGRID_FROM || process.env.GMAIL_USER || "no-reply@habitquest.com";
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.SENDGRID_API_KEY.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }], subject: "Your HabitQuest Verification Code" }],
          from: { email: senderEmail, name: "HabitQuest Security" },
          content: [{ type: "text/html", value: htmlContent }],
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`[SENDGRID EMAIL ERROR] Failed to send to ${to}: ${text}`);
        console.log(`[FALLBACK LOG OTP] Code for ${to} is: ${otp}`);
        return;
      } else {
        console.log(`[SENDGRID EMAIL SENT] Verification code sent to ${to}`);
        console.log(`[EMAIL OTP]: ${otp}`);
        return;
      }
    }

    // 4. Use EmailJS REST API if configured (Bypasses all DMARC/domain rules because it uses Gmail OAuth!)
    if (process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_TEMPLATE_ID && process.env.EMAILJS_PUBLIC_KEY && process.env.EMAILJS_PRIVATE_KEY) {
      console.log(`[EMAILJS] Attempting to send OTP email to ${to} via EmailJS API...`);
      const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: process.env.EMAILJS_SERVICE_ID.trim(),
          template_id: process.env.EMAILJS_TEMPLATE_ID.trim(),
          user_id: process.env.EMAILJS_PUBLIC_KEY.trim(),
          accessToken: process.env.EMAILJS_PRIVATE_KEY.trim(),
          template_params: {
            to_email: to,
            otp_code: otp,
            message: `Your HabitQuest 2-Step Verification code is: ${otp}`,
            html_content: htmlContent,
          },
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown EmailJS error");
        console.error(`[EMAILJS EMAIL ERROR] Failed to send to ${to}: ${errText}`);
        console.log(`[FALLBACK LOG OTP] Code for ${to} is: ${otp}`);
        return;
      } else {
        console.log(`[EMAILJS EMAIL SENT] Verification code sent to ${to}`);
        console.log(`[EMAIL OTP]: ${otp}`);
        return;
      }
    }

    let transporter: nodemailer.Transporter;

    // 2. Use SMTP configuration if provided in environment variables
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
      // Direct Gmail support with explicit SSL port 465 (works reliably on serverless/Vercel)
      const cleanUser = process.env.GMAIL_USER.trim();
      const cleanPass = process.env.GMAIL_PASS.trim().replace(/\s+/g, ""); // Strip spaces from app password
      transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: cleanUser,
          pass: cleanPass,
        },
        connectionTimeout: 15000,
        tls: {
          rejectUnauthorized: false, // Prevents certificate verification failures in serverless containers
        },
      });
    } else {
      console.log(`====================================================`);
      console.log(`[EMAIL SIMULATION MODE] No email API key (BREVO_API_KEY, SENDGRID_API_KEY, RESEND_API_KEY, or GMAIL_USER) found.`);
      console.log(`To send real emails on Vercel, add BREVO_API_KEY or SENDGRID_API_KEY in Vercel settings and REDEPLOY!`);
      console.log(`[SIMULATED EMAIL OTP FOR ${to}]: ${otp}`);
      console.log(`====================================================`);
      return;
    }

    // Gmail requires the 'from' address to match the authenticated user address
    const fromAddress = process.env.GMAIL_USER
      ? `"HabitQuest Security" <${process.env.GMAIL_USER.trim()}>`
      : process.env.SMTP_USER
      ? `"HabitQuest Security" <${process.env.SMTP_USER.trim()}>`
      : '"HabitQuest Security" <no-reply@habitquest.com>';

    const mailOptions = {
      from: fromAddress,
      to,
      subject: "Your HabitQuest Verification Code",
      text: `Welcome back to HabitQuest!\n\nYour 2-Step Verification code is: ${otp}\n\nThis code will expire in 10 minutes.\nIf you did not request this code, please ignore this email.`,
      html: htmlContent,
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
