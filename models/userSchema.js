import bcrypt from "bcrypt";
import { configDotenv } from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import validator from "validator";

configDotenv();

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "First Name Is Required!"],
    minLength: [3, "First Name Must Contain At Least 3 Characters!"],
  },
  lastName: {
    type: String,
    required: [true, "Last Name Is Required!"],
    minLength: [3, "Last Name Must Contain At Least 3 Characters!"],
  },
  email: {
    type: String,
    required: [true, "Email Is Required!"],
    validate: [validator.isEmail, "Provide A Valid Email!"],
  },
  phone: {
    type: String,
    required: [true, "Phone Is Required!"],
    minLength: [11, "Phone Number Must Contain Exact 11 Digits!"],
    maxLength: [11, "Phone Number Must Contain Exact 11 Digits!"],
  },
  dob: {
    type: Date,
    required: [true, "DOB Is Required!"],
  },
  gender: {
    type: String,
    required: [true, "Gender Is Required!"],
    enum: ["Male", "Female"],
  },
  password: {
    type: String,
    required: [true, "Password Is Required!"],
    minLength: [8, "Password Must Contain At Least 8 Characters!"],
    select: false,
  },
  role: {
    type: String,
    required: [true, "User Role Required!"],
    enum: ["Patient", "Doctor", "Admin"],
  },
  doctorDepartment: {
    type: String,
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
    required: function () {
      return this.role === "Doctor";
    },
  },
  doctorFees: {
    type: Number,
    required: function () {
      return this.role === "Doctor";
    },
  },
  joiningDate: {
    type: Date,
    required: function () {
      return this.role === "Doctor";
    },
  },
  resignationDate: {
    type: Date,
    required: false,
  },
  doctorAvailability: {
    type: [
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
    required: function () {
      return this.role === "Doctor";
    },
  },
  docAvatar: {
    public_id: String,
    url: String,
  },
  otp: {
    type: String,
    default: "",
  },

  isConfirmed: { type: Boolean, default: false },
  confirmationToken: { type: String },
  confirmationTokenExpire: { type: Date },
});

// Hash password before saving if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare entered password with stored hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token for user
userSchema.methods.generateJsonWebToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

export const User = mongoose.model("User", userSchema);
