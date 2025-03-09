
   
    import { User } from "../models/userSchema.js";
    import nodemailer from "nodemailer";
    import crypto from "crypto";
    import { configDotenv } from "dotenv";
    configDotenv();
    
    // Nodemailer configuration with SMTP
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for 587
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS,
      },
    });
    
    // Generate a random OTP
    const generateOtp = () => crypto.randomInt(100000, 999999).toString();
    
    // Forgot Password Endpoint
    export const forgotPassword = async (req, res) => {
      try {
        const { email } = req.body;
    
        console.log("Forgot Password Request for:", email); // Debugging log
    
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(404).json({ message: "Email not found" });
        }
    
        const otp = generateOtp();
        user.otp = otp;
        await user.save();
    
        const mailOptions = {
          from: "adilchoice30@gmail.com",
          to: email,
          subject: "Password Reset OTP",
          html: `
          <html>
            <body style="font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <h2 style="color: #271776; text-align: center;">AadiCare - Password Reset Request</h2>
                
                <p>We received a request to reset your password for your AadiCare account. If you did not request this, please ignore this email.</p>
      
                <p><strong>Your One-Time Password (OTP) is: <span style="color: #271776;">${otp}</span></strong></p>
      
                <p>This OTP is valid for 10 minutes.</p>
      
                <p>If you need further assistance, contact <a href="mailto:support@aadicare.com">support@aadicare.com</a>.</p>
      
                <p style="text-align: center;">AadiCare - Your Health, Our Priority</p>
              </div>
            </body>
          </html>
        `,
        };
    
        // Send email
        await transporter.sendMail(mailOptions);
        console.log("OTP sent successfully to:", email);
    
        res.json({ message: "OTP sent to your email" });
      } catch (error) {
        console.error("Error in forgotPassword:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
      }
    };
    