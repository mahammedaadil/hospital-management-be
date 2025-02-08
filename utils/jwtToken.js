import { configDotenv } from "dotenv";

configDotenv();

export const generateToken = (user, message, statusCode, res) => {
    const token = user.generateJsonWebToken();

    // Assign token name based on user role
    let cookieName;
    if (user.role === "Admin") {
        cookieName = "adminToken";
    } else if (user.role === "Doctor") {
        cookieName = "doctorToken";
    } else {
        cookieName = "patientToken";
    }

    // Set cookie with the correct token name
    res
        .status(statusCode)
        // .cookie(cookieName, token, {
        //     expires: new Date(Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        //     httpOnly: true,
        // })
        .json({
            success: true,
            message,
            user,
            token,
        });
};
