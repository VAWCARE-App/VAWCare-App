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
  console.log('📧 SENDMAIL: Called with', { toHeader, subject, hasHtml: !!html });
  console.log('📧 SENDMAIL: Using EMAIL_USER =', process.env.EMAIL_USER ? '***SET***' : '❌ NOT SET');
  console.log('📧 SENDMAIL: Using EMAIL_PASS =', process.env.EMAIL_PASS ? '***SET***' : '❌ NOT SET');
  
  try {
    console.log('📧 SENDMAIL: About to call transporter.sendMail()');
    const info = await transporter.sendMail({
      from: `"VAWCare Support" <${process.env.EMAIL_USER || 'vawcareteam@gmail.com'}>`,
      to: toHeader,
      subject,
      html,
    });
    console.log('✅ SENDMAIL: Success!', { accepted: info.accepted, rejected: info.rejected, messageId: info.messageId });
    if (process.env.SOS_DEBUG && String(process.env.SOS_DEBUG).toLowerCase() !== 'false') {
      console.log(`✅ Email send result: accepted=${JSON.stringify(info.accepted)}, rejected=${JSON.stringify(info.rejected)}`);
    }
    return info;
  } catch (error) {
    console.error("❌ SENDMAIL: Error sending email:", {
      message: error?.message,
      code: error?.code,
      response: error?.response,
      stack: error?.stack
    });
    const e = new Error(`Failed to send email to ${toHeader}: ${error && error.message}`);
    e.original = error;
    throw e;
  }
}

module.exports = { sendMail };
