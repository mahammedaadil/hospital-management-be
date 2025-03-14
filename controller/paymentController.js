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
    const { amount, currency } = req.body;
    const options = {
      amount,
      currency,
      receipt: "order_receipt_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Failed to create order" });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      patientId,
      doctorId,
      appointmentId,
      amount,
    } = req.body;

   

    // Generate the signature for verification
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");


    // Verify the payment signature
    if (generated_signature !== razorpay_signature) {

      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }

    // Save payment details to the database
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

    res.status(200).json({ success: true, message: "Payment verified successfully" });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    });
  }
};

