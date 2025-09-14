import nodemailer from 'nodemailer';

export const initializeMailer = () => {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.mailtrap.io',
    port: process.env.MAIL_PORT || 2525,
    auth: {
      user: process.env.MAIL_USER || 'your_mailtrap_user',
      pass: process.env.MAIL_PASS || 'your_mailtrap_pass'
    }
  });

  return transporter;
};