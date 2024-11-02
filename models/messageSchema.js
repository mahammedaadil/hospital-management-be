import  mongoose from "mongoose";
import validator from "validator";

const messageSchema= new mongoose.Schema({
  
    firstName:{
        type:String,
        required:true,
        minLength:[3,"FIRST NAME MUST CONTAIN AT LEAST 3 CHARACTERS!"]
    },

    lastName:{
        type:String,
        required:true,
        minLength:[3,"LAST NAME MUST CONTAIN AT LEAST 3 CHARACTERS!"]
    },

    email:{
        type:String,
        required:true,
        validate:[validator.isEmail,"PLEASE ENTER VALID EMAIL"]
    },

    phone:{
        type:String,
        required:true,
        minLength:[11,"PHONE NUMBER MUST CONTAIN AT LEAST 11 DIGITS!"],
        maxLength:[11,"PHONE NUMBER MUST CONTAIN AT LEAST 11 DIGITS!"]
    },

    message:{
        type:String,
        required:true,
        minLength:[10,"MESSAGE MUST CONTAIN AT LEAST 10 CHARACTERS!"]
    },


});


export const Message=mongoose.model("Message",messageSchema);