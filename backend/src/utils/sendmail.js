// utils/sendmail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "vawcareteam@gmail.com",
    pass: process.env.EMAIL_PASS || "your_app_password_here",
  },
});

if (process.env.SOS_DEBUG && String(process.env.SOS_DEBUG).toLowerCase() !== 'false') {
  transporter.verify().then(() => {
    console.log('✅ SMTP transporter verified');
  }).catch((err) => {
    console.warn('⚠️ SMTP transporter verification failed:', err && err.message);
  });
}

async function sendMail(to, subject, html) {
  const normalized = Array.isArray(to) ? to : (to instanceof Set ? Array.from(to) : (typeof to === 'string' ? [to] : []));
  const toHeader = normalized.join(',');
  
  console.log('[SENDMAIL] Starting email send:', {
    to: toHeader,
    subject,
    hasEmailUser: !!process.env.EMAIL_USER,
    hasEmailPass: !!process.env.EMAIL_PASS,
    emailUserValue: process.env.EMAIL_USER || 'vawcareteam@gmail.com'
  });
  
  try {
    const mailOptions = {
      from: `"VAWCare Support" <${process.env.EMAIL_USER || 'vawcareteam@gmail.com'}>`,
      to: toHeader,
      subject,
      html,
    };
    
    console.log('[SENDMAIL] Mail options prepared:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      htmlLength: mailOptions.html?.length
    });
    
    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.SOS_DEBUG && String(process.env.SOS_DEBUG).toLowerCase() !== 'false') {
      console.log(`✅ Email send result: accepted=${JSON.stringify(info.accepted)}, rejected=${JSON.stringify(info.rejected)}`);
    }
    
    console.log('[SENDMAIL] Email sent successfully:', {
      accepted: info.accepted,
      rejected: info.rejected,
      messageId: info.messageId
    });
    
    return info;
  } catch (error) {
    console.error("[SENDMAIL ERROR] Error sending email:", {
      message: error && error.message,
      code: error && error.code,
      response: error && error.response,
      stack: error && error.stack,
      toHeader
    });
    const e = new Error(`Failed to send email to ${toHeader}: ${error && error.message}`);
    e.original = error;
    throw e;
  }
}

module.exports = { sendMail };
