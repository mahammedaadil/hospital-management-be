import mongoose from "mongoose";
import validator from "validator";

const paymentSchema = new mongoose.Schema({
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: [true, "Patient ID is required!"],
    validate: {
      validator: mongoose.Types.ObjectId.isValid,
      message: "Invalid Patient ID!",
    },
  },
  doctorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: [true, "Doctor ID is required!"],
    validate: {
      validator: mongoose.Types.ObjectId.isValid,
      message: "Invalid Doctor ID!",
    },
  },
  appointmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Appointment", 
    required: [true, "Appointment ID is required!"],
    validate: {
      validator: mongoose.Types.ObjectId.isValid,
      message: "Invalid Appointment ID!",
    },
  },
  amount: { 
    type: Number, 
    required: [true, "Payment amount is required!"],
    min: [1, "Amount must be at least 1 INR!"],
    validate: {
      validator: (value) => validator.isFloat(value.toString(), { min: 1 }),
      message: "Invalid amount!",
    },
  },
  status: { 
    type: String, 
    enum: ["Pending", "Completed", "Failed"], 
    default: "Pending" 
  },
  paymentMode: { 
    type: String, 
    enum: ["Online", "Offline"], 
    required: [true, "Payment mode is required!"],
  },
  razorpayOrderId: { 
    type: String, 
    validate: {
      validator: function (value) {
        return this.paymentMode === "Online" ? !!value : true;
      },
      message: "Razorpay Order ID is required for online payments!",
    },
  },
  razorpayPaymentId: { 
    type: String, 
    validate: {
      validator: function (value) {
        return this.paymentMode === "Online" ? !!value : true;
      },
      message: "Razorpay Payment ID is required for online payments!",
    },
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  
});

export const Payment = mongoose.model("Payment", paymentSchema);
