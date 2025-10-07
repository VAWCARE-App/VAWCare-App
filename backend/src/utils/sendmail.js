// utils/sendmail.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "vawcareteam@gmail.com",
    pass: process.env.EMAIL_PASS || "your_app_password_here",
  },
});

async function sendMail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: '"VAWCare Support" <vawcareteam@gmail.com>',
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw new Error("Failed to send email");
  }
}

module.exports = { sendMail };
