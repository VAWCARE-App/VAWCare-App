const { MailerSend } = require("mailersend");

const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY
});

async function sendMail(to, subject, html) {
  const recipients = Array.isArray(to) ? to : [to];

  const accepted = [];
  const rejected = [];

  for (const email of recipients) {
    const emailParams = {
      from: {
        email: "MS_OyDH8j@test-pzkmgq78noml059v.mlsender.net",
        name: "VAWCare Support"
      },
      to: [{ email }],
      subject,
      html
    };

    try {
      await mailersend.email.send(emailParams);
      accepted.push(email);
      if (process.env.SOS_DEBUG && String(process.env.SOS_DEBUG).toLowerCase() !== "false") {
        console.log(`[SENDMAIL] Email sent to ${email}`);
      }
    } catch (err) {
      console.error(`[SENDMAIL ERROR] Failed to send email to ${email}:`, err.response?.body || err.message || err);
      rejected.push(email);
    }

  }

  return { accepted, rejected };
}

module.exports = { sendMail };
