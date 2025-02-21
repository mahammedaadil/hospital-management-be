import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import dotenv from "dotenv";

dotenv.config();

const doctorSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "First Name is required!"],
    minLength: [3, "Must be at least 3 characters!"],
  },
  lastName: {
    type: String,
    required: [true, "Last Name is required!"],
    minLength: [3, "Must be at least 3 characters!"],
  },
  email: {
    type: String,
    required: [true, "Email is required!"],
    validate: [validator.isEmail, "Provide a valid email!"],
  },
  phone: {
    type: String,
    required: [true, "Phone is required!"],
    minLength: [11, "Must be exactly 11 digits!"],
    maxLength: [11, "Must be exactly 11 digits!"],
  },
  dob: {
    type: Date,
    required: [true, "DOB is required!"],
  },
  gender: {
    type: String,
    required: [true, "Gender is required!"],
    enum: ["Male", "Female"],
  },
  password: {
    type: String,
    required: [true, "Password is required!"],
    minLength: [8, "Must be at least 8 characters!"],
    select: false,
  },
  doctorDepartment: {
    type: String,
    required: [true, "Doctor's department is required!"],
    enum: [
      "Pediatrics",
      "Orthopedics",
      "Cardiology",
      "Neurology",
      "Oncology",
      "Radiology",
      "Physical Therapy",
      "Dermatology",
      "ENT",
    ],
  },
  doctorFees: {
    type: Number,
    required: [true, "Doctor's fees are required!"],
  },
  joiningDate: {
    type: Date,
    required: [true, "Joining date is required!"],
  },
  resignationDate: {
    type: Date,
    required: false,
  },
  doctorAvailability: [
    {
      day: {
        type: String,
        required: true,
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      },
      timings: {
        type: String,
        required: true,
        enum: [
          "09:00-09:30", "09:30-10:00",
          "10:00-10:30", "10:30-11:00",
          "11:00-11:30", "11:30-12:00",
          "12:00-12:30", "12:30-01:00",
          "14:00-14:30", "14:30-15:00",
          "15:00-15:30", "15:30-16:00",
          "16:00-16:30", "16:30-17:00",
          "17:00-17:30", "17:30-18:00",
          "18:00-18:30", "18:30-19:00",
          "19:00-19:30", "19:30-20:00",
        ],
      },
    },
  ],
  docAvatar: {
    public_id: String,
    url: String,
  },
});

// Hash password before saving
doctorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
doctorSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT
doctorSchema.methods.generateJsonWebToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

export const Doctor = mongoose.model("Doctor", doctorSchema);
