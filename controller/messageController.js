import {catchAsyncErrors} from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/errorMiddleware.js";
import { Message } from "../models/messageSchema.js";
import mongoose from "mongoose";


//ToSendMessages
export const sendMessage = catchAsyncErrors(async (req,res,next) =>{
    const {firstName,lastName,email,phone,message}=req.body;
    if(!firstName || !lastName || !email || !phone || !message){
       return next(new ErrorHandler("Please Fill Full Form!", 400));
    }
        await Message.create({firstName,lastName,email,phone,message});
        res.status(200).json({
            success:true,
            message:"Message sent successfully!",
        });

});

//ToGetMessages 
export const getAllMessages = catchAsyncErrors(async (req, res, next) => {
  const messages = await Message.find();
  res.status(200).json({
    success: true,
    messages,
  });
});


//to delete messages


export const deleteMessage = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid ID format!", 400));
  }

  const message = await Message.findByIdAndDelete(id);
  if (!message) {
    return next(new ErrorHandler("Message not found!", 404));
  }

  res.status(200).json({
    success: true,
    message: "Message deleted successfully!",
  });
});






