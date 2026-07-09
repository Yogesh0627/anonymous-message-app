import UserModel from './../../../models/user';
import { connectDB } from "@/dbConfig/db";
import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";
import { isOtpUnexpired, verifyOtp } from "@/lib/otp";

export async function POST(request:NextRequest){

    // Prevent brute-forcing the 6-digit code.
    const limited = await enforceRateLimit(request, "verify-code", {
        limit: 10,
        windowMs: 10 * 60_000,
    })
    if (limited) return limited

    await connectDB()

    try {
        const body = await request.json()
        const {username,code} = body

        const user = await UserModel.findOne({username})

        if(!user){
            return NextResponse.json({success:false,message:"User not found"},{status:404})
        }

        if (user.isVerified) {
            return NextResponse.json({success:true, message:"User already verified"},{status:200})
        }

        // Constant-time compare against the stored hash; an already-consumed
        // code has been cleared, so it can never validate again.
        const isCodeValid = isOtpUnexpired(user.verificationCodeExpiry)
        const isCodeSame = await verifyOtp(code, user.verificationCode)

        if(isCodeSame && isCodeValid){
            user.isVerified = true
            // Single-use: burn the code so it cannot be replayed.
            user.verificationCode = ""
            user.verificationCodeExpiry = new Date(0)
            await user.save()

            return NextResponse.json({success:true, message:"User Verified"},{status:200})
        }
        if(!isCodeValid){
            return NextResponse.json({success:false, message:"Code expired — please sign up again to get a new code"},{status:410})
        }
        return NextResponse.json({success:false, message:"Wrong OTP code"},{status:400})
    } catch (error:any) {
        // console.log("Error from verifyCode",error.message)
        return NextResponse.json({success:false,message:"Error while verifying user"},{status:500})

    }
}
