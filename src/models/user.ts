
import mongoose,{Document,Schema} from "mongoose"
import { string } from "zod"



export interface Message extends Document{
    content:string,
    // Attribution for a logged-in sender. Hidden from the recipient; used only
    // for crediting and loop-back confirmation. Absent for anonymous (logged-out)
    // senders. See DESIGN.md §12.
    senderId?:mongoose.Types.ObjectId,
    createdAt:Date
}

const messageSchema:Schema<Message> = new Schema({
    content:{
        type:String,
        required:true
    },
    senderId:{
        type:Schema.Types.ObjectId,
        ref:'users',
        required:false
    },
    createdAt:{
        type:Date,
        required:true,
        default:Date.now
    }
})

export interface User extends Document{
    username:string
    // Names this user previously held. Kept reserved so nobody else can claim
    // them, and used to keep old public links (/user/<oldname>) working.
    previousUsernames:string[],
    // Timestamps of past username changes — used to enforce a rolling yearly cap.
    usernameChanges:Date[],
    password:string,
    email:string,
    verificationCode:string,
    verificationCodeExpiry:Date,
    forgotPasswordCode:string,
    forgotPasswordExpiry:Date,
    isVerified:boolean
    isAcceptingMessage:boolean,
    credits:number,
    role:'user'|'admin',
    isBanned:boolean,
    messages:Message[]
}

const userSchema:Schema<User>= new Schema({
    username:{
        type:String,
        required:[true,"Username is required"],
        trim:true,
        unique:true
    },
    previousUsernames:{
        type:[String],
        default:[],
        index:true
    },
    usernameChanges:{
        type:[Date],
        default:[]
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
    // Stores a bcrypt hash of the emailed code, never the code itself. Cleared to
    // '' once consumed, which is why these cannot be `required` — an empty string
    // fails Mongoose's required check. OAuth users never have one at all.
    verificationCode:{
        type:String,
        default:''
    },
    verificationCodeExpiry:{
        type:Date,
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
    credits:{
        type:Number,
        default:0
    },
    role:{
        type:String,
        enum:['user','admin'],
        default:'user'
    },
    isBanned:{
        type:Boolean,
        default:false
    },
    messages:[messageSchema]
})

const UserModel = mongoose.models.users as mongoose.Model<User> || mongoose.model<User>("users",userSchema)

export default UserModel