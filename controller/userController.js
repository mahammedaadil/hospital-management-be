import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import {User} from "../models/userSchema.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { generateToken } from "../utils/jwtToken.js";
import cloudinary from "cloudinary";





//Patient Registration

export const patientRegister= catchAsyncErrors(async(req,res,next)=>{
    const{
        firstName,
        lastName,
        email,
        phone,
        password,
        confirmPassword,
        gender,
        dob,
        role,
    } =req.body;

    if(
        !firstName ||
        !lastName ||
        !email ||
        !phone ||
        !password ||
        !confirmPassword ||
        !gender ||
        !dob ||
        !role 
    )
    {
        return next(new ErrorHandler("Please Fill Full Form",400));
    }

    let user=await User.findOne({email});

    if (password !== confirmPassword) {
      return next(
        new ErrorHandler("Password & Confirm Password Do Not Match!", 400)
      );
    }
    
    if(user){

       return next(new ErrorHandler("User Already Registered!",400));

    }

    user=await User.create({
        firstName,
        lastName,
        email,
        phone,
        password,
        confirmPassword,
        gender,
        dob,
        role,
    });
    

    generateToken(user,"User Registered!",200,res)

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
   
    generateToken(user,"User Login SuccessFully!",200,res)

  });


//Admin Registration
export const addNewAdmin = catchAsyncErrors(async (req, res, next) => {
  const { firstName, lastName, email, phone, dob, gender, password ,confirmPassword} =
    req.body;
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
    return next(new ErrorHandler(`${isRegistered.role} With This Email Already Exists!`));
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
    !docAvatar
  ) {
    return next(new ErrorHandler("Please Fill Full Form!", 400));
  }
  const isRegistered = await User.findOne({ email });
  
  if (password !== confirmPassword) {
    return next(
      new ErrorHandler("Password & Confirm Password Do Not Match!", 400)
    );
  }

  if (isRegistered) {
    return next(
      new ErrorHandler("Doctor With This Email Already Exists!", 400)
    );
  }
  const cloudinaryResponse = await cloudinary.uploader.upload(
    docAvatar.tempFilePath
  );
  if (!cloudinaryResponse || cloudinaryResponse.error) {
    console.error(
      "Cloudinary Error:",
      cloudinaryResponse.error || "Unknown Cloudinary error"
    );
    return next(
      new ErrorHandler("Failed To Upload Doctor Avatar To Cloudinary", 500)
    );
  }
  const doctor = await User.create({
    firstName,
    lastName,
    email,
    phone,
    dob,
    gender,
    password,
    confirmPassword,
    role: "Doctor",
    doctorDepartment,
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


//get doctor


// Get Doctor by ID
export const getDoctorById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  // Validate ObjectId
  if (!isValidObjectId(id)) {
    return next(new ErrorHandler("Invalid Doctor ID!", 400));
  }

  // Find the doctor by ID
  const doctor = await User.findById(id);
  if (!doctor || doctor.role !== "Doctor") {
    return next(new ErrorHandler("Doctor Not Found!", 404));
  }

  res.status(200).json({
    success: true,
    doctor,
  });
});

// Function to validate ObjectId
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};


//delete doctor

// Delete Doctor by ID
export const deleteDoctor = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  // Find the doctor by ID
  const doctor = await User.findById(id);
  if (!doctor || doctor.role !== "Doctor") {
    return next(new ErrorHandler("Doctor Not Found!", 404));
  }

  // If the doctor has an avatar, delete it from Cloudinary
  if (doctor.docAvatar && doctor.docAvatar.public_id) {
    await cloudinary.uploader.destroy(doctor.docAvatar.public_id);
  }

  // Delete the doctor from the database
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

 
  await doctor.save();

  res.status(200).json({
    success: true,
    message: "Doctor Updated Successfully!",
    doctor,
  });
});








