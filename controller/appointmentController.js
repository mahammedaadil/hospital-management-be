import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { Appointment } from "../models/appoinmentSchema.js";
import { User } from "../models/userSchema.js";
import moment from "moment";

// Available time slots
const availableTimeSlots = [
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

  // Validate appointment date format
  if (!moment(appointment_date, "YYYY-MM-DD", true).isValid()) {
    return next(new ErrorHandler("Invalid appointment date format!", 400));
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

  // Check if the doctor is available on the selected date
  const doctorAvailability = doctor.doctorAvailability || []; // Assuming doctorAvailability is an array of objects like { day, timings }
  const appointmentDay = moment(appointment_date).format('dddd'); // Get the day of the week from appointment_date

  // Find the availability for the selected day
  const availableDay = doctorAvailability.find(availability => availability.day === appointmentDay);

  if (!availableDay) {
    return next(new ErrorHandler("Doctor is not available on the selected day.", 400));
  }

  // Check if the selected time slot is available on that day
  if (!availableDay.timings.includes(timeSlot)) {
    return next(new ErrorHandler("Doctor is not available at the selected time.", 400));
  }

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

            // Check if the new appointment's start or end time overlaps with existing appointments
            return startTime.isBefore(slotEndTime) && endTime.isAfter(slotStartTime);
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
    hasVisited: hasVisited || false, // Default to false if not provided
    address: address || '', // Default to an empty string if not provided
    doctorId,
    patientId,
    appointmentStatus: 'pending', // Set initial status to 'pending'
    fee: doctor.paymentFee || 0, // Assuming a payment fee field on the doctor model
  });

  res.status(200).json({
    success: true,
    appointment,
    message: "Appointment booked successfully!",
  });
});

// Get All Appointments (for admin or authorized users)
export const getAllAppointments = catchAsyncErrors(async (req, res, next) => {
  const appointments = await Appointment.find().populate('doctorId', 'firstName lastName doctorDepartment');
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
  const appointments = await Appointment.find({ patientId }).populate('doctorId', 'firstName lastName doctorDepartment');

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

// Get Appointments for the logged-in Doctor
export const getDoctorAppointments = catchAsyncErrors(async (req, res, next) => {
  const doctorId = req.user._id; // Logged-in doctor ID

  if (req.user.role !== "Doctor") {
    return next(new ErrorHandler("Access denied! Only doctors can view their appointments.", 403));
  }

  const appointments = await Appointment.find({ doctorId }).populate('patientId', 'firstName lastName');

  res.status(200).json({
    success: true,
    appointments,
  });
});
