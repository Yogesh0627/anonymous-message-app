import  bcrypt  from 'bcryptjs';
import { connectDB } from "@/dbConfig/db";
import { sendForgotPasswordEmail } from "@/helpers/sendForgotPasswordEmail";
import UserModel from "@/models/user";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request:NextRequest,response:NextResponse){

    await connectDB()
    try {
        const {searchParams} = new URL(request.url)
        const myquery:string = searchParams.get("email") ||""
        // console.log(myquery)
        const ifEmailExist = await UserModel.findOne({email:myquery})
        // console.log(ifEmailExist)
        if (!ifEmailExist){
            return NextResponse.json({success:false,message:"User with this email not exist"},{status:404})
        }

        const forgotPasswordCode = Math.floor(100000+Math.random()*900000).toString()
        const forgotPasswordExpiry = new Date()
        forgotPasswordExpiry.setHours(forgotPasswordExpiry.getHours() + 1)

        const afterAddingForgotPasswordExpiry = await UserModel.findOneAndUpdate({email:myquery},{$set:{forgotPasswordExpiry:forgotPasswordExpiry,forgotPasswordCode:forgotPasswordCode}},{new:true})
        // console.log(afterAddingForgotPasswordExpiry)
        const afterEmail = await sendForgotPasswordEmail(myquery,ifEmailExist.username,forgotPasswordCode)
        return NextResponse.json({success:true,message:"user exist with this email"},{status:200})
    } catch (error:any) {
        // console.log("error from forgotPassword",error)
        return NextResponse.json({success:false,message:"Error while checking user"},{status:500})
    }
}


export async function POST(request:NextRequest){

    await connectDB()

    try {
        const body = await request.json()
        const{newPassword,code,email} = body
        // console.log(body , "body from fp")
        const user = await UserModel.findOne({email})

        if(!user){
            return NextResponse.json({success:false,msg:"User not found"},{status:404})
        }
        // console.log(user)
        const isCodeSame = user.forgotPasswordCode === code
        const isCodeValid = new Date(user.forgotPasswordExpiry) > new Date()
        if(isCodeSame && isCodeValid){
            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash(newPassword,salt)
            
            user.password = hashedPassword
            user.forgotPasswordCode=""
            
            await user.save()

            return NextResponse.json({success:true, message:"Password Changed Successfully"},{status:202})
        }
        else if(!isCodeValid){
            return NextResponse.json({success:false, message:"Code Expired try again after signup again"},{status:202})
        }
        else{
            return NextResponse.json({success:false, message:"Wrong OTP code"},{status:202})
        }
    } catch (error) {
        console.log("error from forgotPassword",error)
        return NextResponse.json({success:false,message:"Error while registering New Password"},{status:500})    }
}