const sgMail = require('@sendgrid/mail');

// Set your SendGrid API key in environment variables
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendMail(to, subject, html) {
  const recipients = Array.isArray(to) ? to : [to];

  const accepted = [];
  const rejected = [];

  for (const email of recipients) {
    const msg = {
      from: {
        email: 'vawcaresystem@gmail.com', // e.g. "support@yourdomain.com"
        name: 'VAWCare Support',
      },
      to: email,
      subject,
      html,
    };

    try {
      await sgMail.send(msg);
      accepted.push(email);
      if (process.env.SOS_DEBUG && String(process.env.SOS_DEBUG).toLowerCase() !== 'false') {
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
