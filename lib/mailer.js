import nodemailer from 'nodemailer';

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error('Faltan GMAIL_USER y/o GMAIL_APP_PASSWORD en las variables de entorno.');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

export async function enviarMail({ to, subject, html, text }) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"Cronograma ILCE" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
    html
  });
}
