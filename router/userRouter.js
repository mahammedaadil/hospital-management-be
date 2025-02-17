import express from "express";
import {
  addNewAdmin,
  addNewDoctor,
  getAllDoctors,
  getUserDetails,
  login,
  logoutAdmin,
  logoutPatient,
  patientRegister,
  deleteDoctor,
  updateDoctor,
  getDoctorById
} from "../controller/userController.js";
import { isAdminAuthenticated, isPatientAuthenticated, isDoctorAuthenticated, isAuthorized } from "../middlewares/auth.js";
import { forgotPassword } from "../controller/forgotPasswordController.js";
import { resetPasswordController } from "../controller/resetPasswordController.js";
import { verifiedOtpController } from "../controller/verifyOtpController.js";

const router = express.Router();

// Public Routes
router.post("/patient/register", patientRegister); 
router.post("/login", login);

// Admin Routes
router.post("/admin/addnew", isAdminAuthenticated, addNewAdmin); 
router.get("/admin/me", isAdminAuthenticated, getUserDetails); 
router.get("/admin/logout", isAdminAuthenticated, logoutAdmin); 
router.get("/doctor/:id", isAdminAuthenticated, getDoctorById); 

// Patient Routes
router.get("/patient/me", isPatientAuthenticated, getUserDetails); 
router.get("/patient/logout", isPatientAuthenticated, logoutPatient); 

// Doctor Routes
router.get("/doctor/me", isDoctorAuthenticated, getUserDetails); 

// Admin & Doctor Routes
router.post("/doctor/addnew", isAuthorized("Admin", "Doctor"), addNewDoctor); 
router.delete("/doctor/:id", isAuthorized("Admin", "Doctor"), deleteDoctor); 
router.put("/doctor/update/:id", isAuthorized("Admin", "Doctor"), updateDoctor); 
router.get("/doctors", getAllDoctors); 

// Password & OTP Routes
router.post("/forgot-password", forgotPassword); 
router.post("/reset-password", resetPasswordController); 
router.post("/verify-otp", verifiedOtpController); 

export default router;
