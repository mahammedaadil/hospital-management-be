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
  getDoctorById,
} from "../controller/userController.js";
import {
  isAdminAuthenticated,
  isPatientAuthenticated,
} from "../middlewares/auth.js";
import { forgotPassword } from "../controller/forgotPasswordController.js";
import { resetPasswordController } from "../controller/resetPasswordController.js";
import { verifiedOtpController } from "../controller/verifyOtpController.js";

const router = express.Router();

router.post("/patient/register", patientRegister);
router.post("/login", login);
router.post("/admin/addnew", isAdminAuthenticated, addNewAdmin);
router.get("/doctors", getAllDoctors);
router.get("/admin/me", isAdminAuthenticated, getUserDetails);
router.get("/patient/me", isPatientAuthenticated, getUserDetails);
router.get("/admin/logout", isAdminAuthenticated, logoutAdmin);
router.get("/patient/logout", isPatientAuthenticated, logoutPatient);
router.post("/doctor/addnew", isAdminAuthenticated, addNewDoctor);
router.delete("/doctor/:id", isAdminAuthenticated, deleteDoctor);
router.put("/doctor/update/:id", isAdminAuthenticated, updateDoctor);
router.get("/doctor/:id", isAdminAuthenticated, getDoctorById);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPasswordController);
router.post("/verify-otp", verifiedOtpController);

export default router;
