import UserModel, { Message } from './../../../models/user';
import { connectDB } from "@/dbConfig/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request:NextRequest){

    await connectDB()

    try {
        const body = await request.json()
        const {username,code} = body

        const user = await UserModel.findOne({username})

        if(!user){
            return NextResponse.json({success:false,msg:"User not found"},{status:404})
        }

        const isCodeSame = user.verificationCode === code
        const isCodeValid = new Date(user.verificationCodeExpiry) > new Date()
    
        if(isCodeSame && isCodeValid){
            user.isVerified = true
            await user.save()

            return NextResponse.json({success:true, message:"User Verified"},{status:202})
        }
        else if(!isCodeValid){
            return NextResponse.json({success:false, message:"Code Expired try again after signup again"},{status:202})
        }
        else{
            return NextResponse.json({success:false, message:"Wrong OTP code"},{status:202})
        }
    } catch (error:any) {
        // console.log("Error from verifyCode",error.message)
        return NextResponse.json({success:false,message:"Error while verifying user"},{status:500})

    }
}