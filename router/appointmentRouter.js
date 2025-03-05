import express from "express";
import { getAllAppointments, postAppointment, updateAppointmentStatus, deleteAppointment, getPatientAppointments, getDoctorAppointments ,getDoctors,getAppointmentsForToday,rescheduleAppointments} from "../controller/appointmentController.js";
import { isDoctorAuthenticated, isAdminAuthenticated, isPatientAuthenticated, isAuthorized } from "../middlewares/auth.js";

const router = express.Router();

// Patient Routes
router.post("/post", isPatientAuthenticated, postAppointment); 
router.get("/getpatient/:id", isPatientAuthenticated, getPatientAppointments); 

// Doctor Routes
router.get("/doctor", isAuthorized("Admin", "Doctor"),isDoctorAuthenticated, getDoctorAppointments); 
router.get("/doctors", isAuthorized("Admin", "Doctor"),getDoctors);
router.get("/appointments/today/:doctorId",isAuthorized("Admin", "Doctor"),getAppointmentsForToday);
router.put("/appointments/reschedule", isAuthorized("Admin", "Doctor"),rescheduleAppointments);

// Admin & Doctor Routes

router.get("/getall", isAuthorized("Admin", "Doctor"), getAllAppointments); 
router.put("/update/:id", isAuthorized("Admin", "Doctor"), updateAppointmentStatus); 
router.delete("/delete/:id", isAuthorized("Admin", "Doctor"), deleteAppointment); 

export default router;
