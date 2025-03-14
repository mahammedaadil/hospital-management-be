import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import { User } from "../models/userSchema.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { generateToken } from "../utils/jwtToken.js";
import cloudinary from "cloudinary";
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Email transporter configuration (using Gmail as an example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Function to generate a random OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Function to send OTP email
const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code for Registration',
    text: `Your OTP for registration is: ${otp}`
  };

  await transporter.sendMail(mailOptions);
};

// Modified patient registration function
export const patientRegister = catchAsyncErrors(async (req, res, next) => {
  const { firstName, lastName, email, phone, password, confirmPassword, gender, dob, role } = req.body;

  if (!firstName || !lastName || !email || !phone || !password || !confirmPassword || !gender || !dob || !role) {
    return next(new ErrorHandler("Please Fill Full Form", 400));
  }

  let user = await User.findOne({ email });

  if (password !== confirmPassword) {
    return next(new ErrorHandler("Password & Confirm Password Do Not Match!", 400));
  }

  if (user) {
    return next(new ErrorHandler("User Already Registered!", 400));
  }

  // Generate OTP and send email
  const otp = generateOTP();
  await sendOTPEmail(email, otp);

  // Store OTP temporarily (could be in memory, cache, or database)
  user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    password,
    confirmPassword,
    gender,
    dob,
    role,
    otp, // Store OTP for verification
  });

  // Send OTP verification message to frontend
  generateToken(user, "User Registered! Please Verify OTP.", 200, res);
});

// OTP verification route
export const verifyOTP = catchAsyncErrors(async (req, res, next) => {
  const { email, otp } = req.body;
  let user = await User.findOne({ email });

  if (!user) {
    return next(new ErrorHandler("User Not Found!", 404));
  }

  if (user.otp !== otp) {
    return next(new ErrorHandler("Invalid OTP!", 400));
  }

  // OTP verified, you can now register the user
  user.otp = ''; // Clear OTP after successful verification
  await user.save();

  generateToken(user, "User Verified and Registered!", 200, res);
});


//Patient Login

export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return next(new ErrorHandler("Please Fill Full Form!", 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid Email Or Password!", 400));
  }

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    return next(new ErrorHandler("Invalid Email Or Password!", 400));
  }
  if (role !== user.role) {
    return next(new ErrorHandler(`User Not Found With This Role!`, 400));
  }

  generateToken(user, "User Login SuccessFully!", 200, res);
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
