import express from "express";
import { getAllAppointments, postAppointment, updateAppointmentStatus,deleteAppointment,getPatientAppointments} from "../controller/appointmentController.js";
import { isAdminAuthenticated ,isPatientAuthenticated,isAuthorized} from "../middlewares/auth.js";

const router = express.Router();

router.post("/post",isPatientAuthenticated,postAppointment);
router.get("/getall",isAuthorized("Admin", "Doctor") ,getAllAppointments);
router.put("/update/:id",isAuthorized("Admin", "Doctor") ,updateAppointmentStatus);
router.delete("/delete/:id",isAuthorized("Admin", "Doctor") , deleteAppointment);
router.get("/getpatient/:id",isPatientAuthenticated, getPatientAppointments);

export default router;