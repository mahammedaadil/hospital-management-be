import express from "express";
import { getAllMessages, sendMessage, deleteMessage } from "../controller/messageController.js";
import { isAuthorized } from "../middlewares/auth.js";

const router = express.Router();

// Patient Routes
router.post("/send", sendMessage); 

// Admin & Doctor Routes
router.get("/getall", isAuthorized("Admin", "Doctor"), getAllMessages); 
router.delete("/delete/:id", isAuthorized("Admin", "Doctor"), deleteMessage); 

export default router;
