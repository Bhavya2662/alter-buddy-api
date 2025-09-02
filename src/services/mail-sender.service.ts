import nodemailer from "nodemailer";

export const MailSender = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587, // TLS port
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: true,
  },
});
