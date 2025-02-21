import { configDotenv } from "dotenv";
import jwt from "jsonwebtoken";
import { User } from "../models/userSchema.js";
import { catchAsyncErrors } from "./catchAsyncErrors.js";
import ErrorHandler from "./errorMiddleware.js";

configDotenv();

// Common authentication middleware
const authenticateUser = catchAsyncErrors(async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return next(new ErrorHandler("User is not authenticated!", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return next(new ErrorHandler("User not found!", 404));
    }

    next();
  } catch (error) {
    return next(new ErrorHandler("Invalid token!", 401));
  }
});

// Admin authentication
export const isAdminAuthenticated = [
  authenticateUser,
  (req, res, next) => {
    if (req.user.role !== "Admin") {
      return next(
        new ErrorHandler(`${req.user.role} not authorized for this resource!`, 403)
      );
    }
    next();
  }
];

// Patient authentication
export const isPatientAuthenticated = [
  authenticateUser,
  (req, res, next) => {
    if (req.user.role !== "Patient") {
      return next(
        new ErrorHandler(`${req.user.role} not authorized for this resource!`, 403)
      );
    }
    next();
  }
];




// Doctor authentication
export const isDoctorAuthenticated = [
  authenticateUser,
  (req, res, next) => {
    if (req.user.role !== "Doctor") {
      return next(
        new ErrorHandler(`${req.user.role} not authorized for this resource!`, 403)
      );
    }
    next();
  }
];

// Role-based authorization
export const isAuthorized = (...roles) => [
  authenticateUser, // Ensure authentication before checking roles
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `${req.user.role} not allowed to access this resource!`,
          403
        )
      );
    }
    next();
  }
];
