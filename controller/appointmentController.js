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

  // Validate required fields
  if (
    !firstName || !lastName || !email || !phone || !dob ||
    !gender || !appointment_date || !timeSlot ||
    !department || !doctor_firstName || !doctor_lastName || !address
  ) {
    return next(new ErrorHandler("Please fill in all the required fields!", 400));
  }

  // Validate appointment date format
  if (!moment(appointment_date, "YYYY-MM-DD", true).isValid()) {
    return next(new ErrorHandler("Invalid appointment date format!", 400));
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
    status: 'Pending',
    tokenNumber,  // Unique token for each time slot
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

//get docs 
export const getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find(); // Assuming Doctor is the model for doctors
    res.status(200).json({ doctors });
  } catch (error) {
    res.status(500).json({ message: "Error fetching doctors" });
  }
};

//get appoint


export const getAppointmentsForToday = async (req, res) => {
  const { doctorId } = req.params; // Ensure the correct parameter is passed in the request
  const today = new Date().toISOString().split("T")[0]; // Get today's date

  try {
    const appointments = await Appointment.find({
      doctorId,
      appointment_date: { $gte: new Date(today), $lt: new Date(new Date(today).setDate(new Date(today).getDate() + 1)) }
    })
      .populate("doctorId", "firstName lastName")  // Populating doctor details
      .populate("patientId", "firstName lastName"); // Populating patient details

    if (!appointments || appointments.length === 0) {
      return res.status(404).json({ message: "No appointments found for today" });
    }

    res.status(200).json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ message: "Error fetching appointments" });
  }
};
//reschedule 
export const rescheduleAppointments = async (req, res) => {
  const { doctorId, newDate, appointments } = req.body;
  try {
    // Ensure that all appointments are updated to the new date
    await Promise.all(
      appointments.map(async (appointment) => {
        await Appointment.findByIdAndUpdate(appointment._id, { date: newDate });
      })
    );
    res.status(200).json({ message: "Appointments rescheduled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to reschedule appointments" });
  }
};
