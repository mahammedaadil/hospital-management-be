import nodemailer from "nodemailer";

const sendEmail = async ({ email, subject, html }) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail", // Use "Gmail", "Outlook", or your SMTP service
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Hospital Management" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html,
  });
};

export default sendEmail;
