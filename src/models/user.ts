
import mongoose,{Document,Schema} from "mongoose"
import { string } from "zod"



export interface Message extends Document{
    content:string,
    createdAt:Date
}

const messageSchema:Schema<Message> = new Schema({
    content:{
        type:String,
        required:true
    },
    createdAt:{
        type:Date,
        required:true,
        default:Date.now
    }
})

export interface User extends Document{
    username:string
    password:string,
    email:string,
    verificationCode:string,
    verificationCodeExpiry:Date,
    forgotPasswordCode:string,
    forgotPasswordExpiry:Date,
    isVerified:boolean
    isAcceptingMessage:boolean,
    messages:Message[]
}

const userSchema:Schema<User>= new Schema({
    username:{
        type:String,
        required:[true,"Username is required"],
        trim:true,
        unique:true
    },
    password:{
        type:String,
        required:[true,"Password is required"],
        trim:true

    },
    email:{
        type:String,
        required:[true,"Email is Required"],
        unique:true,
        trim:true,
        match:[/.+\@.+\..+/,"Please provide a valid email"]
    },
    verificationCode:{
        type:String,
        required:[true,"Verify code is required for verification"]
    },
    verificationCodeExpiry:{
        type:Date,
        required:[true,"Verification code expiry is required"]
    },
    forgotPasswordCode:{
        type:String,
    },
    forgotPasswordExpiry:{
        type:Date,
        
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    isAcceptingMessage:{
        type:Boolean,
        default:true
    },
    messages:[messageSchema]
})

const UserModel = mongoose.models.users as mongoose.Model<User> || mongoose.model<User>("users",userSchema)

export default UserModel