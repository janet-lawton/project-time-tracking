const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendInvoiceEmail(to, subject, htmlContent) {
  try {
    const data = await resend.emails.send({
      from: 'Invoices <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: htmlContent,
    });
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

module.exports = {
  sendInvoiceEmail,
};