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
  updateDoctor,
  getDoctorById,
  updateUserProfile,
  confirmEmail,
  adminLogin,
  doctorLogin,activateDoctor,deactivateDoctor 
  
} from "../controller/userController.js";
import {
  isAdminAuthenticated,
  isPatientAuthenticated,
  isDoctorAuthenticated,
  isAuthorized
} from "../middlewares/auth.js";
import { forgotPassword } from "../controller/forgotPasswordController.js";
import { resetPasswordController } from "../controller/resetPasswordController.js";
import { verifiedOtpController } from "../controller/verifyOtpController.js";

const router = express.Router();
router.put('/doctor/activate/:id',isAuthorized("Admin", "Doctor") , activateDoctor);
router.put('/doctor/deactivate/:id',isAuthorized("Admin", "Doctor") , deactivateDoctor);
router.get("/confirm-email/:token", confirmEmail);
router.post("/patient/register", patientRegister);
router.post("/login", login);
router.post("/loginadmin",adminLogin)
router.post("/logindoctor",doctorLogin)
router.post("/admin/addnew", isAdminAuthenticated, addNewAdmin);
router.get("/doctors", getAllDoctors);
router.get("/admin/me",isAdminAuthenticated,getUserDetails);
router.get("/patient/me",isAuthorized("Patient"),getUserDetails);
router.get("/doctor/me",isDoctorAuthenticated,getUserDetails);
router.get("/admin/logout",isAdminAuthenticated,logoutAdmin);
router.get("/patient/logout",isPatientAuthenticated, logoutPatient);
router.post("/doctor/addnew", isAuthorized("Admin", "Doctor") , addNewDoctor);
router.put("/doctor/update/:id", isAuthorized("Admin", "Doctor"), updateDoctor);
router.get("/doctor/:id", isAdminAuthenticated, getDoctorById);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPasswordController);
router.post("/verify-otp", verifiedOtpController);
router.put("/patient/update", isPatientAuthenticated, updateUserProfile);
router.get("/doctor/:id", isPatientAuthenticated, getDoctorById);




export default router;
