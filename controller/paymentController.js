import Razorpay from "razorpay";
import crypto from "crypto";
import { Payment } from "../models/paymentSchema.js";
import { configDotenv } from "dotenv";

configDotenv();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = async (req, res) => {
  try {
    const { amount, userId, doctorId, appointmentId } = req.body;
    
    const options = {
      amount: amount * 100, // Razorpay works in paisa
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    console.log("Razorpay Order Created:", order); // Add this line to log the created order
    
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error("Error creating order:", error); // Log the error to get more details
    res.status(500).json({ success: false, message: "Failed to create order", error: error.message });
  }
};


export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, patientId, doctorId, appointmentId, amount } = req.body;

    console.log("Received data:", req.body); // Log received data for debugging

    // Generate the signature for verification
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    console.log("Generated Signature:", generated_signature); // Log generated signature

    // Verify the payment signature
    if (generated_signature !== razorpay_signature) {
      console.log("Signature mismatch!");
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // Save payment details to the database if the payment is verified
    const payment = await Payment.create({
      patientId,
      doctorId,
      appointmentId,
      amount,
      status: "Completed",
      paymentMode: "Online",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    console.log("Payment successfully verified and stored:", payment); // Log payment success
    res.status(200).json({ success: true, message: "Payment verified successfully" });
  } catch (error) {
    console.error("Error in payment verification:", error); // Log the error stack
    res.status(500).json({ success: false, message: "Payment verification failed", error: error.message });
  }
};
