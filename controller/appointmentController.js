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
// Assume Razorpay integration is already set up.

export const postAppointment = catchAsyncErrors(async (req, res, next) => {
  const {
    firstName, lastName, email, phone, dob, gender,
    appointment_date, timeSlot, department,
    doctor_firstName, doctor_lastName, hasVisited, address, paymentMode,
  } = req.body;

  // Validate required fields
  if (
    !firstName || !lastName || !email || !phone || !dob ||
    !gender || !appointment_date || !timeSlot ||
    !department || !doctor_firstName || !doctor_lastName || !address || !paymentMode
  ) {
    return next(new ErrorHandler("Please fill in all the required fields!", 400));
  }

  // Find doctor based on name and department
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
  const patientId = req.user._id; // Logged-in patient ID

  // Check doctor's availability for the selected day
  const doctorAvailability = doctor.doctorAvailability || [];
  const appointmentDay = moment(appointment_date).format('dddd'); // e.g., Monday

  const availableDay = doctorAvailability.find(
    (availability) => availability.day === appointmentDay
  );

  if (!availableDay || !availableDay.timings.includes(timeSlot)) {
    return next(new ErrorHandler("Doctor is not available at the selected time.", 400));
  }

  // Allow up to 15 appointments per time slot
  const existingAppointmentsCount = await Appointment.countDocuments({
    doctorId,
    appointment_date,
    timeSlot,
  });

  if (existingAppointmentsCount >= 2) {
    return next(new ErrorHandler("Sorry, this time slot is full.", 409));
  }

  // Check for online payment if selected
  if (paymentMode === "Pay Online") {
    // Integrate Razorpay or any payment gateway logic here
    const paymentSuccess = await processOnlinePayment(req.body);
    if (!paymentSuccess) {
      return next(new ErrorHandler("Payment failed. Please try again.", 400));
    }
  }

  // Assign a token number based on the current count
  const tokenNumber = existingAppointmentsCount + 1;

  // Create the appointment
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
    hasVisited: hasVisited || false,
    address,
    doctorId,
    patientId,
    status: paymentMode === "Pay Online" ? 'Paid' : 'Pending', // Set status based on payment
    tokenNumber,  // Unique token for each time slot
  });

  res.status(200).json({
    success: true,
    appointment,
    message: "Appointment booked successfully!",
  });
});

// Payment processing function
async function processOnlinePayment(paymentDetails) {
  // Process the payment using Razorpay API or any other payment gateway
  // This function should return true if payment is successful and false otherwise
  try {
    // Razorpay API integration for payment verification
    const razorpayPayment = await razorpay.paymentVerification(paymentDetails);
    return razorpayPayment.status === 'success'; // Example of success status check
  } catch (error) {
    console.error("Payment error:", error);
    return false;
  }
}



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

//get docs 
export const getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find(); // Assuming Doctor is the model for doctors
    res.status(200).json({ doctors });
  } catch (error) {
    res.status(500).json({ message: "Error fetching doctors" });
  }
};


export const rescheduleAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { appointment_date, timeSlot } = req.body;


  try {
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    appointment.appointment_date = new Date(appointment_date); // Convert to Date object
    appointment.timeSlot = timeSlot;

    await appointment.save();

    return res.status(200).json({ message: "Appointment rescheduled successfully.", appointment });
  } catch (error) {
    console.error("Reschedule Error:", error);
    return res.status(500).json({ message: "Failed to reschedule appointment.", error });
  }
};
