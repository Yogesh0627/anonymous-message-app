import { connectDB } from "@/dbConfig/db"
import UserModel from "@/models/user"
import { NextRequest, NextResponse } from "next/server"
import bcrypt from 'bcryptjs'
import { sendVerificationEmail } from "@/helpers/sendVerificationEmail"

connectDB()

export async function POST(request:NextRequest) {
    try {
        const body = await request.json()
        // console.log("body from signup",body)
        const {username,email,password} = body
        const existingUserVerifiedByUsername = await UserModel.findOne({username,isVerified:true})

        
        if(existingUserVerifiedByUsername){
            return NextResponse.json({success:false,msg:"Username already taken"},{status:400})
        }
        const existingUserByEmail = await UserModel.findOne({email})
        const verificationCode = Math.floor(100000+Math.random()*900000).toString()
        if(existingUserByEmail){
            if (existingUserByEmail.isVerified){
                return NextResponse.json({success:false,message:"User Already Exist With This Email"},{status:401})
            }
            else {
                const hashedPassword = await bcrypt.hash(password, 10);
                existingUserByEmail.password = hashedPassword;
                existingUserByEmail.verificationCode = verificationCode;
                existingUserByEmail.verificationCodeExpiry = new Date(Date.now() + 3600000);
                await existingUserByEmail.save();
              }
        }else{
            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash(password,salt)

            const expiryDate = new Date()
            expiryDate.setHours(expiryDate.getHours() + 1)

            const newUser = new UserModel({
                username,
                email,
                password:hashedPassword,
                verificationCode,
                verificationCodeExpiry:expiryDate,
                isVerified:false,
                isAcceptingMessage:true,
                messages:[]
            })

            const savedUser = await newUser.save()
        }
        const emailResponse = await sendVerificationEmail(email,username,verificationCode)
        
        if(!emailResponse.success){
            return NextResponse.json({success:false,message:emailResponse.message},{status:500})
        }
        return NextResponse.json({success:true,message:"user registered successfully"},{status:200})

    } catch (error:any) {
        // console.log("Error from signup routes", error.message)
        return NextResponse.json({success:false,message:"Error regestering User"},{status:500})
    }
}