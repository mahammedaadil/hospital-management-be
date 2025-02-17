import express from "express";
import { getAllAppointments, postAppointment, updateAppointmentStatus, deleteAppointment, getPatientAppointments, getDoctorAppointments } from "../controller/appointmentController.js";
import { isDoctorAuthenticated, isAdminAuthenticated, isPatientAuthenticated, isAuthorized } from "../middlewares/auth.js";

const router = express.Router();

// Patient Routes
router.post("/post", isPatientAuthenticated, postAppointment); 
router.get("/getpatient/:id", isPatientAuthenticated, getPatientAppointments); 

// Doctor Routes
router.get("/doctor", isDoctorAuthenticated, getDoctorAppointments); 

// Admin & Doctor Routes
router.get("/getall", isAuthorized("Admin", "Doctor"), getAllAppointments); 
router.put("/update/:id", isAuthorized("Admin", "Doctor"), updateAppointmentStatus); 
router.delete("/delete/:id", isAuthorized("Admin", "Doctor"), deleteAppointment); 

export default router;
