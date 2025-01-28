import { User } from "../models/userSchema.js";
import nodemailer from "nodemailer";
import crypto from "crypto";
// Nodemailer configuration with direct credentials
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "adilchoice30@gmail.com",
    pass: "yafxzrcpnnriprbm",
  },
});

// Generate a random OTP
const generateOtp = () => crypto.randomInt(100000, 999999).toString();

// Forgot Password Endpoint
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }

    const otp = generateOtp();
    user.otp = otp;
    await user.save();

    const mailOptions = {
      from: "adilchoice30@gmail.com", // Replace with your Gmail address
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}`,
      html: `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333; background-color: #f7f7f7; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #271776; text-align: center; font-size: 24px;">AadiCare - Password Reset Request</h2>
            
            <p style="font-size: 16px; line-height: 1.5; color: #555;">
              Dear valued patient,
            </p>
            
            <p style="font-size: 16px; line-height: 1.5; color: #555;">
              We have received a request to reset your password for your AadiCare account. If you did not initiate this request, please ignore this email.
            </p>
  
            <p style="font-size: 16px; line-height: 1.5; font-weight: bold; color: #271776;">
              Your One-Time Password (OTP) is: <span style="color: #271776;">${otp}</span>
            </p>
  
            <p style="font-size: 16px; line-height: 1.5; color: #555;">
              This OTP is valid for the next 10 minutes. Please use it to proceed with resetting your password.
            </p>
  
            <p style="font-size: 16px; line-height: 1.5; color: #555;">
              If you need further assistance, feel free to contact us at <a href="mailto:support@aadicare.com" style="color: #271776; text-decoration: none;">support@aadicare.com</a>.
            </p>
  
            <br />
  
            <p style="font-size: 16px; line-height: 1.5; text-align: center; color: #555;">
              Thank you for choosing AadiCare. We are committed to providing you with the best healthcare experience.
            </p>
  
            <p style="font-size: 16px; line-height: 1.5; text-align: center; color: #555;">
              AadiCare - Your Health, Our Priority
            </p>
  
            <p style="font-size: 14px; line-height: 1.5; text-align: center; color: #aaa;">
              This is an automated message, please do not reply directly to this email.
            </p>
          </div>
        </body>
      </html>
    `,
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to send OTP" });
      }
      res.json({ message: "OTP sent to your email" });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
