// routes/paymentRoutes.js
import express from "express";
import { createOrder, verifyPayment } from "../controller/paymentController.js";
import { Appointment } from "../models/appoinmentSchema.js";
import { Payment } from "../models/paymentSchema.js";

const router = express.Router();

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
// Fetch Payment and Appointment details using appointmentId
router.get("/payment-appointment/:appointmentId", async (req, res) => {
    try {
      const { appointmentId } = req.params;
  
      // Fetch payment details with patient and doctor information
      const payment = await Payment.findOne({ appointmentId })
        .populate("patientId", "firstName lastName email phone")
        .populate("doctorId", "firstName lastName email phone");
  
      if (!payment) {
        return res.status(404).json({ message: "Payment details not found!" });
      }
  
      // Fetch corresponding appointment details
      const appointment = await Appointment.findById(appointmentId);
  
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found!" });
      }
  
      // Combine Payment & Appointment Data
      const response = {
        appointmentId: appointment._id,
        patient: {
          firstName: appointment.firstName,
          lastName: appointment.lastName,
          email: appointment.email,
          phone: appointment.phone,
        },
        doctor: {
          firstName: appointment.doctor.firstName,
          lastName: appointment.doctor.lastName,
        },
        appointmentDate: appointment.appointment_date,
        timeSlot: appointment.timeSlot,
        tokenNumber: appointment.tokenNumber,
        department: appointment.department,
        paymentDetails: {
          amount: payment.amount,
          status: payment.status,
          paymentMode: payment.paymentMode,
          razorpayOrderId: payment.razorpayOrderId || "N/A",
          razorpayPaymentId: payment.razorpayPaymentId || "N/A",
        },
      };
  
      res.status(200).json(response);
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({ message: "Internal Server Error!" });
    }
  });

  router.get("/getbyappointment/:appointmentId", async (req, res) => {
    try {
      const payment = await Payment.findOne({ appointmentId: req.params.appointmentId });
      if (!payment) return res.status(404).json({ message: "No payment found for this appointment" });
  
      res.json({ payment });
    } catch (error) {
      res.status(500).json({ message: "Error fetching payment details" });
    }
  });

  
  

export default router;

