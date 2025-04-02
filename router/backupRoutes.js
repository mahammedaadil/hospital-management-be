import express from "express";
import { backupDatabase } from "../controller/backupController.js";
import fs from "fs";
import archiver from "archiver";
import path from "path";
import cors from "cors";

const router = express.Router();
const app = express();
const PORT = 5000;

app.use(cors());

// Backup database on request
router.post("/backupnow", backupDatabase);

// Backup full project folder excluding node_modules
router.get("/backup", (req, res) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFolder = "D:/backup";
    const backupFilename = `backup_${timestamp}.zip`;
    const backupPath = path.join(backupFolder, backupFilename);
    const output = fs.createWriteStream(backupPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
        console.log(`Backup created: ${backupPath}`);
        res.json({ success: true, message: "Backup created successfully,Backup Path:D:/Backup ", file: backupFilename });
    });

    archive.on("error", (err) => res.status(500).json({ success: false, error: err.message }));
    archive.pipe(output);
    
    const projectPath = path.resolve("../");
    fs.readdirSync(projectPath).forEach(dir => {
        const fullPath = path.join(projectPath, dir);
        if (fs.lstatSync(fullPath).isDirectory() && dir !== "node_modules") {
            archive.glob("**/*", {
                cwd: fullPath,
                ignore: ["**/node_modules/**"]
            }, { prefix: dir });
        }
    });
    
    archive.finalize();
});

app.listen(PORT, () => console.log(`Backup server running on port ${PORT}`));

export default router;
