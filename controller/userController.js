import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import { User } from "../models/userSchema.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { generateToken } from "../utils/jwtToken.js";
import cloudinary from "cloudinary";
import nodemailer from 'nodemailer';
import crypto from "crypto";
import bcrypt from "bcrypt";
import sendEmail from "./sendEmail.js";



//patient register



export const patientRegister = catchAsyncErrors(async (req, res, next) => {
  const { firstName, lastName, email, phone, password, confirmPassword, gender, dob, role } = req.body;

  if (!firstName || !lastName || !email || !phone || !password || !confirmPassword || !gender || !dob || !role) {
    return next(new ErrorHandler("Please fill out all required fields!", 400));
  }

  let user = await User.findOne({ email });

  if (user) {
    return next(new ErrorHandler("User already registered!", 400));
  }

  if (password !== confirmPassword) {
    return next(new ErrorHandler("Passwords do not match!", 400));
  }

  // 🔹 Generate confirmation token
  const confirmationToken = crypto.randomBytes(32).toString("hex");
  const confirmationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // Expires in 24 hours

  // 🔹 Save user with token
  user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    password,
    gender,
    dob,
    role,
    confirmationToken,
    confirmationTokenExpire,
    isConfirmed: false, // Default to false until confirmed
  });

  console.log("✅ User created with confirmation token:", user.confirmationToken);

  

  // 🔹 Send confirmation email
  const confirmLink = `${process.env.FRONTEND_URL}/confirm-email/${confirmationToken}`;
  const message = `
    <h2>Hello ${firstName},</h2>
    <p>Thank you for registering. Please click the link below to confirm your email:</p>
    <a href="${confirmLink}" style="padding: 10px 20px; background-color: #28a745; color: #fff; text-decoration: none; border-radius: 5px;">Confirm Email</a>
    <p>This link will expire in 24 hours.</p>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: "Confirm Your Email - Hospital Management System",
      html: message,
    });

    console.log("📧 Confirmation email sent to:", user.email);

    res.status(200).json({
      success: true,
      message: "Registration successful! Please check your email to confirm your account.",
    });
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    return next(new ErrorHandler("Email could not be sent. Please try again later.", 500));
  }
});



//userConfirmation
export const confirmEmail = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.params;
  console.log("Received Token:", token);

  if (!token) {
    console.log("❌ No token received!");
    return next(new ErrorHandler("No Token Provided!", 400));
  }

  const user = await User.findOne({ confirmationToken: token });

  if (!user) {
    console.log("❌ User not found for this token!");
    return next(new ErrorHandler("Invalid Token!", 400));
  }

  console.log("✅ User found! Checking token expiration...");
  console.log("Current Time:", new Date().toISOString());
  console.log("Token Expiry Time:", user.confirmationTokenExpire.toISOString());

  if (user.confirmationTokenExpire < Date.now()) {
    console.log("❌ Token Expired!");
    return next(new ErrorHandler("Token Expired!", 400));
  }

  console.log("✅ Token is valid! Confirming email...");

  // 🔹 Confirm email & remove token
  user.isConfirmed = true;
  

  await user.save({ validateBeforeSave: false });

  // 🔹 Delay response to ensure MongoDB update is completed
  setTimeout(() => {
    console.log("✅ Email confirmed successfully!");
    res.status(200).json({
      success: true,
      message: "Email confirmed successfully! You can now log in.",
    });
  }, 1000); // 1-second delay
});


//Patient Login

export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  if (!user.isConfirmed) {
    return next(new ErrorHandler("Please confirm your email before logging in.", 403));
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return next(new ErrorHandler("Invalid Email or Password", 400));
  }

  generateToken(user, "User Logged-In Successfully", 200, res);
});


//Admin Registration
export const addNewAdmin = catchAsyncErrors(async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    dob,
    gender,
    password,
    confirmPassword,
  } = req.body;
  if (
    !firstName ||
    !lastName ||
    !email ||
    !phone ||
    !dob ||
    !gender ||
    !password ||
    !confirmPassword
  ) {
    return next(new ErrorHandler("Please Fill Full Form!", 400));
  }

  const isRegistered = await User.findOne({ email });
  if (isRegistered) {
    return next(
      new ErrorHandler(`${isRegistered.role} With This Email Already Exists!`)
    );
  }

  if (password !== confirmPassword) {
    return next(
      new ErrorHandler("Password & Confirm Password Do Not Match!", 400)
    );
  }

  const admin = await User.create({
    firstName,
    lastName,
    email,
    phone,
    dob,
    gender,
    password,
    confirmPassword,

    role: "Admin",
  });
  res.status(200).json({
    success: true,
    message: "New Admin Registered",
    admin,
  });
});

//Doctor Registration & Getting Doctor Details
export const addNewDoctor = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next(new ErrorHandler("Doctor Avatar Required!", 400));
  }

  const { docAvatar } = req.files;
  const allowedFormats = ["image/png", "image/jpeg", "image/webp"];

  if (!allowedFormats.includes(docAvatar.mimetype)) {
    return next(new ErrorHandler("File Format Not Supported!", 400));
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    dob,
    gender,
    password,
    confirmPassword,
    doctorDepartment,
    doctorFees,
    joiningDate,
    resignationDate,
    doctorAvailability,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !email ||
    !phone ||
    !dob ||
    !gender ||
    !password ||
    !confirmPassword ||
    !doctorDepartment ||
    !doctorFees ||
    !joiningDate ||
    !doctorAvailability
  ) {
    return next(new ErrorHandler("Please Fill Full Form!", 400));
  }

  const isRegistered = await User.findOne({ email });

  if (isRegistered) {
    return next(new ErrorHandler("Doctor With This Email Already Exists!", 400));
  }

  if (password !== confirmPassword) {
    return next(new ErrorHandler("Password & Confirm Password Do Not Match!", 400));
  }

  const cloudinaryResponse = await cloudinary.uploader.upload(docAvatar.tempFilePath, {
    folder: "doctors_avatars",
  });

  if (!cloudinaryResponse || cloudinaryResponse.error) {
    console.error("Cloudinary Error:", cloudinaryResponse.error || "Unknown Cloudinary error");
    return next(new ErrorHandler("Failed To Upload Doctor Avatar To Cloudinary", 500));
  }

  // Create a new doctor record in the User model
  const doctor = await User.create({
    firstName,
    lastName,
    email,
    phone,
    dob,
    gender,
    password,
    role: "Doctor",
    doctorDepartment,
    doctorFees,
    joiningDate,
    resignationDate,
    doctorAvailability: JSON.parse(doctorAvailability),
    docAvatar: {
      public_id: cloudinaryResponse.public_id,
      url: cloudinaryResponse.secure_url,
    },
  });

  res.status(200).json({
    success: true,
    message: "New Doctor Registered",
    doctor,
  });
});



export const getAllDoctors = catchAsyncErrors(async (req, res, next) => {
  const doctors = await User.find({ role: "Doctor" });
  res.status(200).json({
    success: true,
    doctors,
  });
});


export const getUserDetails = catchAsyncErrors(async (req, res, next) => {
  // Ensure the user exists (for example, if not logged in, req.user might be null)
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
  }
  
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});


// Logout function for  admin
export const logoutAdmin = catchAsyncErrors(async (req, res, next) => {
  res
    .status(200)
    .cookie("adminToken", "", {
      httpOnly: true,
      expires: new Date(Date.now()),
    })
    .json({
      success: true,
      message: "Admin Logged Out Successfully.",
    });
});

//logout Function For Patient

export const logoutPatient = catchAsyncErrors(async (req, res, next) => {
  res
    .status(200)
    .cookie("patientToken", "", {
      httpOnly: true,
      expires: new Date(Date.now()),
    })
    .json({
      success: true,
      message: "Patient Logged Out Successfully.",
    });
});


// Logout function for  admin
export const logoutDoctor= catchAsyncErrors(async (req, res, next) => {
  res
    .status(200)
    .cookie("doctorToken", "", {
      httpOnly: true,
      expires: new Date(Date.now()),
    })
    .json({
      success: true,
      message: "Doctor Logged Out Successfully.",
    });
});

//get doctor

// Get Doctor by ID
export const getDoctorById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;


  if (!isValidObjectId(id)) {
    return next(new ErrorHandler("Invalid Doctor ID!", 400));
  }


  const doctor = await User.findById(id);
  if (!doctor || doctor.role !== "Doctor") {
    return next(new ErrorHandler("Doctor Not Found!", 404));
  }

  res.status(200).json({
    success: true,
    doctor,
  });
});


const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

//delete doctor


export const deleteDoctor = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const doctor = await User.findById(id);
  if (!doctor || doctor.role !== "Doctor") {
    return next(new ErrorHandler("Doctor Not Found!", 404));
  }

  
  if (doctor.docAvatar && doctor.docAvatar.public_id) {
    await cloudinary.uploader.destroy(doctor.docAvatar.public_id);
  }

  await User.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "Doctor Deleted Successfully!",
  });
});

//update doctor

export const updateDoctor = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  const {
    firstName,
    lastName,
    email,
    phone,
    dob,
    gender,
    doctorDepartment,
    doctorFees,
    joiningDate,
    resignationDate,
    doctorAvailability,
  } = req.body;

  let doctor = await User.findById(id);
  if (!doctor || doctor.role !== "Doctor") {
    return next(new ErrorHandler("Doctor Not Found!", 404));
  }

  doctor.firstName = firstName || doctor.firstName;
  doctor.lastName = lastName || doctor.lastName;
  doctor.email = email || doctor.email;
  doctor.phone = phone || doctor.phone;
  doctor.dob = dob || doctor.dob;
  doctor.gender = gender || doctor.gender;
  doctor.doctorDepartment = doctorDepartment || doctor.doctorDepartment;
  doctor.doctorFees = doctorFees || doctor.doctorFees;
  doctor.joiningDate = joiningDate || doctor.joiningDate;
  doctor.resignationDate = resignationDate || doctor.resignationDate;
  doctor.doctorAvailability = doctorAvailability 
    ? JSON.parse(doctorAvailability) 
    : doctor.doctorAvailability;

  await doctor.save();

  res.status(200).json({
    success: true,
    message: "Doctor Updated Successfully!",
    doctor,
  });
});


export const updateUserProfile = async (req, res) => {
  try {
    const { firstName, lastName, dob, gender, email, phone } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !dob || !gender || !email || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Update the user profile
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, dob, gender, email, phone },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully!",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
