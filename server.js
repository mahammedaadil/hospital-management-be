import cloudinary from "cloudinary";
import { configDotenv } from "dotenv";
import app from "./app.js";
configDotenv()

cloudinary.v2.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET,
});

app.listen(process.env.PORT,() => {
    console.log(`Server Listening At port ${process.env.PORT}`);
});