import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { Appointment } from "../models/appoinmentSchema.js";
import { User } from "../models/userSchema.js";
import moment from "moment";

// Available time slots
const availableTimeSlots = [
  "10:00-10:30", "10:30-11:00", "11:00-11:30", "11:30-12:00",
  "12:00-12:30", "12:30-13:00", "13:00-13:30", "13:30-14:00",
  "14:00-14:30", "14:30-15:00", "15:00-15:30", "15:30-16:00",
  "16:00-16:30", "16:30-17:00", "17:00-17:30", "17:30-18:00",
  "18:00-18:30", "18:30-19:00", "19:00-19:30", "19:30-20:00",
  "20:00-20:30", "20:30-21:00", "21:00-21:30", "21:30-22:00",
  "22:00-22:30", "22:30-23:00"
];

// To Send Appointment
export const postAppointment = catchAsyncErrors(async (req, res, next) => {
  const {
    firstName, lastName, email, phone, dob, gender,
    appointment_date, timeSlot, department,
    doctor_firstName, doctor_lastName, hasVisited, address,
  } = req.body;

  // Check if all required fields are provided
  if (
    !firstName || !lastName || !email || !phone || !dob ||
    !gender || !appointment_date || !timeSlot ||
    !department || !doctor_firstName || !doctor_lastName || !address
  ) {
    return next(new ErrorHandler("Please fill in all the required fields!", 400));
  }

  // Check if the timeSlot is valid
  if (!availableTimeSlots.includes(timeSlot)) {
    return next(new ErrorHandler("Invalid time slot selected!", 400));
  }

  // Find the doctor based on name and department
  const doctor = await User.findOne({
    firstName: doctor_firstName,
    lastName: doctor_lastName,
    role: "Doctor",
    doctorDepartment: department,
  });

  if (!doctor) {
    return next(new ErrorHandler("Doctor not found!", 404));
  }

  const doctorId = doctor._id;
  const patientId = req.user._id; // Get the ID of the logged-in patient

  // Check for appointment conflicts within 30 minutes of the selected time
  const startTime = moment(appointment_date + " " + timeSlot.split("-")[0], "YYYY-MM-DD HH:mm");
  const endTime = moment(appointment_date + " " + timeSlot.split("-")[1], "YYYY-MM-DD HH:mm");

  const conflictingAppointments = await Appointment.find({
    doctorId,
    appointment_date,
    $or: [
      {
        timeSlot: {
          $in: availableTimeSlots.filter(slot => {
            const [slotStart, slotEnd] = slot.split("-");
            const slotStartTime = moment(appointment_date + " " + slotStart, "YYYY-MM-DD HH:mm");
            const slotEndTime = moment(appointment_date + " " + slotEnd, "YYYY-MM-DD HH:mm");

            // Check if the time slots overlap by 30 minutes
            return startTime.isBetween(slotStartTime, slotEndTime, null, "[)") ||
                   endTime.isBetween(slotStartTime, slotEndTime, null, "[)");
          })
        }
      }
    ]
  });

  if (conflictingAppointments.length > 0) {
    return next(new ErrorHandler("The doctor is unavailable at the selected time. Please choose another time slot.", 409));
  }

  // Create a new appointment
  const appointment = await Appointment.create({
    firstName,
    lastName,
    email,
    phone,
    dob,
    gender,
    appointment_date,
    timeSlot,
    department,
    doctor: {
      firstName: doctor_firstName,
      lastName: doctor_lastName,
    },
    hasVisited,
    address,
    doctorId,
    patientId,
  });

  res.status(200).json({
    success: true,
    appointment,
    message: "Appointment booked successfully!",
  });
});

// Get All Appointments (for admin or authorized users)
export const getAllAppointments = catchAsyncErrors(async (req, res, next) => {
  const appointments = await Appointment.find();
  res.status(200).json({
    success: true,
    appointments,
  });
});

// To Update an Appointment
export const updateAppointmentStatus = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const appointment = await Appointment.findById(id);

  if (!appointment) {
    return next(new ErrorHandler("Appointment not found!", 404));
  }

  await Appointment.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
    message: "Appointment Status Updated!",
  });
});

// To Delete an Appointment
export const deleteAppointment = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const appointment = await Appointment.findById(id);
  
  if (!appointment) {
    return next(new ErrorHandler("Appointment Not Found!", 404));
  }

  await appointment.deleteOne();
  res.status(200).json({
    success: true,
    message: "Appointment Deleted!",
  });
});

// Get Appointments for the logged-in Patient
export const getPatientAppointments = catchAsyncErrors(async (req, res) => {
  const patientId = req.user._id; // Get the ID of the logged-in patient

  // Fetch appointments for the logged-in patient
  const appointments = await Appointment.find({ patientId });

  if (!appointments || appointments.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No appointments found for this patient.",
    });
  }

  res.status(200).json({
    success: true,
    appointments,
  });
});
