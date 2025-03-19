import express from "express";
import { backupDatabase } from "../controller/backupController.js";

const router = express.Router();

// Backup database on request
router.post("/backupnow", backupDatabase);

export default router;
