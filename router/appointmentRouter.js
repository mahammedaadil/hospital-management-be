import express from "express";
import { getAllAppointments, postAppointment, updateAppointmentStatus,deleteAppointment,getPatientAppointments} from "../controller/appointmentController.js";
import { isAdminAuthenticated ,isPatientAuthenticated} from "../middlewares/auth.js";

const router = express.Router();

router.post("/post",isPatientAuthenticated,postAppointment);
router.get("/getall",isAdminAuthenticated,getAllAppointments);
router.put("/update/:id",isAdminAuthenticated,updateAppointmentStatus);
router.delete("/delete/:id", isAdminAuthenticated, deleteAppointment);
router.get("/getpatient/:id", isPatientAuthenticated, getPatientAppointments);
export default router;