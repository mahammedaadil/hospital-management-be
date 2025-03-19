import mongoose from "mongoose";

export const dbConnection = () => {
    mongoose
        .connect(process.env.MONGO_URI, {
            dbName: "MERN_STACK_HOSPITAL_MANAGEMENT_SYSTEM",
        })
        .then(() => {
            console.log("Successfully Connected With Main Database!");
        })
        .catch((err) => {
            console.log(`Error connecting to Main Database: ${err}`);
        });

    // Connect to Backup Database
    mongoose
        .createConnection(process.env.MONGO_URI, {
            dbName: "MERN_STACK_HOSPITAL_MANAGEMENT_SYSTEM_BACKUP",
        })
        .asPromise()
        .then(() => {
            console.log("Successfully Connected With Backup Database!");
        })
        .catch((err) => {
            console.log(`Error connecting to Backup Database: ${err}`);
        });
};
