import { User } from "../models/userSchema.js";

// Verify OTP Endpoint
export const verifiedOtpController = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log(otp);

    const user = await User.findOne({ email });
    console.log(user);
    if (!user || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    res.json({ message: "OTP verified" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
