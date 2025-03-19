import mongoose from "mongoose";
import { dbConnection } from "../database/dbConnection.js"; // Ensure this is correctly imported

// Call the database connection function
dbConnection();

// Get references to both databases
const mainDb = mongoose.connection.useDb("MERN_STACK_HOSPITAL_MANAGEMENT_SYSTEM");
const backupDb = mongoose.connection.useDb("MERN_STACK_HOSPITAL_MANAGEMENT_SYSTEM_BACKUP");

export const backupDatabase = async (req, res) => {
    try {
        // Get all collections from the main database
        const collections = await mainDb.db.listCollections().toArray();

        for (const collection of collections) {
            const collectionName = collection.name;

            // Fetch data from the main database
            const data = await mainDb.collection(collectionName).find().toArray();

            if (data.length > 0) {
                // Clear the backup database's collection before inserting new data
                await backupDb.collection(collectionName).deleteMany({});
                await backupDb.collection(collectionName).insertMany(data);
            }
        }

        res.json({ success: true, message: "Database backup completed successfully!" });
    } catch (error) {
        console.error("Backup Error:", error);
        res.status(500).json({ success: false, message: "Error backing up database" });
    }
};
