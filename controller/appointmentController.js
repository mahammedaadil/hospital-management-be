import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { Appointment } from "../models/appoinmentSchema.js";
import { Payment } from "../models/paymentSchema.js";
import { User } from "../models/userSchema.js";
import moment from "moment";
import crypto from "crypto";
import nodemailer from "nodemailer";

// Available time slots
const availableTimeSlots = [
  "09:00-09:30",
  "09:30-10:00",
  "10:00-10:30",
  "10:30-11:00",
  "11:00-11:30",
  "11:30-12:00",
  "12:00-12:30",
  "12:30-01:00",
  "14:00-14:30",
  "14:30-15:00",
  "15:00-15:30",
  "15:30-16:00",
  "16:00-16:30",
  "16:30-17:00",
  "17:00-17:30",
  "17:30-18:00",
  "18:00-18:30",
  "18:30-19:00",
  "19:00-19:30",
  "19:30-20:00",
];

// Get All Appointments (for admin or authorized users)
export const getAllAppointments = catchAsyncErrors(async (req, res, next) => {
  const appointments = await Appointment.find().populate(
    "doctorId",
    "firstName lastName doctorDepartment"
  );
  res.status(200).json({
    success: true,
    appointments,
  });
});


export const postAppointment = catchAsyncErrors(async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    dob,
    gender,
    appointment_date,
    timeSlot,
    department,
    doctor_firstName,
    doctor_lastName,
    hasVisited,
    address,
    paymentMethod,
    paymentId,
    razorpay_order_id,
    razorpay_signature,
    doctor_fees,
  } = req.body;


  // Validate required fields
  if (
    !firstName ||
    !lastName ||
    !email ||
    !phone ||
    !dob ||
    !gender ||
    !appointment_date ||
    !timeSlot ||
    !department ||
    !doctor_firstName ||
    !doctor_lastName ||
    !address ||
    !paymentMethod
  ) {
    return next(
      new ErrorHandler("Please fill in all the required fields!", 400)
    );
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
  const patientId = req.user._id;
  

  const doctorAvailability = doctor.doctorAvailability || [];
  const appointmentDay = moment(appointment_date).format("dddd");

  const availableDay = doctorAvailability.find(
    (availability) => availability.day === appointmentDay
  );

  if (!availableDay || !availableDay.timings.includes(timeSlot)) {
    return next(
      new ErrorHandler("Doctor is not available at the selected time.", 400)
    );
  }

  // Allow up to 15 appointments per time slot
  const existingAppointmentsCount = await Appointment.countDocuments({
    doctorId,
    appointment_date,
    timeSlot,
  });

  if (existingAppointmentsCount >= 5) {
    return next(new ErrorHandler("Sorry, this time slot is full.", 409));
  }

  // Assign a token number based on the current count
  const tokenNumber = existingAppointmentsCount + 1;

  // **Create Appointment Entry First**
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
    tokenNumber,
  });

  // **Handle Online Payment Verification**
  if (paymentMethod === "Online") {
  
    

    if (!paymentId || !razorpay_order_id || !razorpay_signature) {
      console.log("inside if at 404..");
      return next(new ErrorHandler("Payment verification failed!", 400));
    }

    // Generate the HMAC SHA256 hash for signature verification
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${paymentId}`)
      .digest("hex");


    if (generated_signature !== razorpay_signature) {
      return next(new ErrorHandler("Invalid signature....!", 400));
    }
  }

  await Payment.create({
    patientId,
    doctorId,
    appointmentId: appointment._id,
    amount: doctor_fees,
    status: "Completed",
    paymentMode: paymentMethod,
    razorpayOrderId: paymentMethod === "Online" ? razorpay_order_id : null,
    paymentStatus: "Paid",
  });

  res.status(200).json({
    success: true,
    appointment,
    message: "Appointment booked successfully!",
  });
});


// To Update an Appointment
export const updateAppointmentStatus = catchAsyncErrors(
  async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;

    const appointment = await Appointment.findById(id)
      .populate("patientId")
      .populate("doctorId"); // Populate doctor details

    if (!appointment) {
      return next(new ErrorHandler("Appointment not found!", 404));
    }

    // Update appointment status
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true, useFindAndModify: false }
    );

    // Fetch patient and doctor details
    const patientEmail = appointment.patientId.email;
    const patientName = `${appointment.patientId.firstName} ${appointment.patientId.lastName}`;
    const doctorName = `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`;
    const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString();
    const appointmentTime = appointment.timeSlot;

    // Send email to the patient
    if (patientEmail) {
      await sendAppointmentStatusEmail(patientEmail, patientName, status, doctorName, appointmentDate, appointmentTime);
    }

    res.status(200).json({
      success: true,
      message: "Appointment Status Updated!",
    });
  }
);

// Function to send email with appointment details
const sendAppointmentStatusEmail = async (email, name, status, doctor, date, time) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: "your-email@gmail.com",
      to: email,
      subject: "Appointment Status Update - AadiCare",
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #271776; text-align: center;">AadiCare - Appointment Status Update</h2>
              
              <p>Dear <strong>${name}</strong>,</p>
              
              <p>Your appointment status has been updated to: <strong style="color: #271776;">${status}</strong>.</p>
              
              <p><strong>Appointment Details:</strong></p>
              <ul>
                <li><strong>Date:</strong> ${date}</li>
                <li><strong>Time:</strong> ${time}</li>
                <li><strong>Doctor:</strong> ${doctor}</li>
              </ul>

              <p>If you have any questions, feel free to contact <a href="mailto:support@aadicare.com">support@aadicare.com</a>.</p>
              
              <p style="text-align: center;">AadiCare - Your Health, Our Priority</p>
            </div>
          </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

// Function to send email with appointment details


// To Delete an Appointment


export const deleteAppointment = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  // Find the appointment and populate patient & doctor details
  const appointment = await Appointment.findById(id)
    .populate("patientId", "firstName lastName email")
    .populate("doctorId", "firstName lastName");

  if (!appointment) {
    return next(new ErrorHandler("Appointment Not Found!", 404));
  }

  // Extract appointment details
  const patientEmail = appointment.patientId.email;
  const patientName = `${appointment.patientId.firstName} ${appointment.patientId.lastName}`;
  const doctorName = `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`;
  const appointmentDate = new Date(appointment.appointment_date).toDateString();
  const appointmentTime = appointment.timeSlot;

  // Delete the appointment
  await appointment.deleteOne();

  // Send cancellation email to patient
  if (patientEmail) {
    await sendCancellationEmail(patientEmail, patientName, doctorName, appointmentDate, appointmentTime);
  }

  res.status(200).json({
    success: true,
    message: "Appointment Deleted!",
  });
});

// Function to send cancellation email
const sendCancellationEmail = async (email, name, doctor, date, time) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Appointment Cancelled - AadiCare",
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #271776; text-align: center;">AadiCare - Appointment Cancelled</h2>
              
              <p>Dear <strong>${name}</strong>,</p>
              
              <p>We regret to inform you that your appointment with <strong style="color: #271776;">${doctor}</strong> has been cancelled,if you have paid <strong>Online </strong>you will get refund soon.</p>

              <p><strong>Cancelled Appointment Details:</strong></p>
              <ul>
                <li><strong>Date:</strong> ${date}</li>
                <li><strong>Time:</strong> ${time}</li>
              </ul>

              <p>If you need further assistance, please contact <a href="mailto:support@aadicare.com">support@aadicare.com</a>.</p>
              
              <p style="text-align: center;">AadiCare - Your Health, Our Priority</p>
            </div>
          </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending cancellation email:", error);
  }
};

// Get Appointments for the logged-in Patient
export const getPatientAppointments = catchAsyncErrors(async (req, res) => {
  const patientId = req.user._id; // Get the ID of the logged-in patient

  // Fetch appointments for the logged-in patient
  const appointments = await Appointment.find({ patientId }).populate(
    "doctorId",
    "firstName lastName doctorDepartment"
  );

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
export const getDoctorAppointments = catchAsyncErrors(
  async (req, res, next) => {
    const doctorId = req.user._id; // Logged-in doctor ID

    if (req.user.role !== "Doctor") {
      return next(
        new ErrorHandler(
          "Access denied! Only doctors can view their appointments.",
          403
        )
      );
    }

    const appointments = await Appointment.find({ doctorId }).populate(
      "patientId",
      "firstName lastName"
    );

    res.status(200).json({
      success: true,
      appointments,
    });
  }
);

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
    const appointment = await Appointment.findById(appointmentId)
      .populate("patientId", "firstName lastName email")
      .populate("doctorId", "firstName lastName");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    // Update appointment details
    appointment.appointment_date = new Date(appointment_date);
    appointment.timeSlot = timeSlot;
    await appointment.save();

    // Get patient and doctor details
    const patientEmail = appointment.patientId.email;
    const patientName = `${appointment.patientId.firstName} ${appointment.patientId.lastName}`;
    const doctorName = `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`;

    // Send email notification to the patient
    if (patientEmail) {
      await sendRescheduleEmail(patientEmail, patientName, appointment_date, timeSlot, doctorName);
    }

    return res.status(200).json({
      message: "Appointment rescheduled successfully.",
      appointment,
    });
  } catch (error) {
    console.error("Reschedule Error:", error);
    return res.status(500).json({
      message: "Failed to reschedule appointment.",
      error,
    });
  }
};

// Function to send reschedule email
const sendRescheduleEmail = async (email, name, date, time, doctor) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Appointment Rescheduled - AadiCare",
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #271776; text-align: center;">AadiCare - Appointment Rescheduled</h2>
              
              <p>Dear <strong>${name}</strong>,</p>
              
              <p>Your appointment with <strong style="color: #271776;">${doctor}</strong> has been rescheduled.</p>

              <p><strong>New Appointment Details:</strong></p>
              <ul>
                <li><strong>Date:</strong> ${new Date(date).toDateString()}</li>
                <li><strong>Time:</strong> ${time}</li>
              </ul>
              
              <p>If you have any questions, feel free to contact <a href="mailto:support@aadicare.com">support@aadicare.com</a>.</p>
              
              <p style="text-align: center;">AadiCare - Your Health, Our Priority</p>
            </div>
          </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending reschedule email:", error);
  }
};

