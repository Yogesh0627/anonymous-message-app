import  bcrypt  from 'bcryptjs';
import { connectDB } from "@/dbConfig/db";
import { sendForgotPasswordEmail } from "@/helpers/sendForgotPasswordEmail";
import UserModel from "@/models/user";
import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";
import { generateOtp, hashOtp, isOtpUnexpired, verifyOtp } from "@/lib/otp";
import { passwordValidation } from "@/inputValidations/passwordValidation";
import { z } from "zod";

export const dynamic = "force-dynamic"

const resetSchema = z.object({
    email: z.string().email(),
    code: z.string().length(6, "Reset code must be 6 digits"),
    newPassword: passwordValidation,
})

export async function GET(request:NextRequest,response:NextResponse){

    const limited = await enforceRateLimit(request, "forgot-password", { limit: 5, windowMs: 60 * 60_000 })
    if (limited) return limited

    await connectDB()
    try {
        const {searchParams} = new URL(request.url)
        const myquery:string = searchParams.get("email") ||""
        const ifEmailExist = await UserModel.findOne({email:myquery})
        if (!ifEmailExist){
            return NextResponse.json({success:false,message:"User with this email not exist"},{status:404})
        }

        // Email the plaintext code; persist only its hash.
        const forgotPasswordCode = generateOtp()
        const forgotPasswordExpiry = new Date()
        forgotPasswordExpiry.setHours(forgotPasswordExpiry.getHours() + 1)

        await UserModel.findOneAndUpdate(
            {email:myquery},
            {$set:{forgotPasswordExpiry, forgotPasswordCode: await hashOtp(forgotPasswordCode)}},
        )
        await sendForgotPasswordEmail(myquery,ifEmailExist.username,forgotPasswordCode)
        return NextResponse.json({success:true,message:"user exist with this email"},{status:200})
    } catch (error:any) {
        return NextResponse.json({success:false,message:"Error while checking user"},{status:500})
    }
}


export async function POST(request:NextRequest){

    // This is the endpoint that CONSUMES the reset code, so it is the one that
    // must be brute-force protected — a 6-digit code is only 10^6 wide.
    const limited = await enforceRateLimit(request, "forgot-password-reset", {
        limit: 5,
        windowMs: 15 * 60_000,
    })
    if (limited) return limited

    await connectDB()

    try {
        const parsed = resetSchema.safeParse(await request.json().catch(() => null))
        if (!parsed.success) {
            return NextResponse.json(
                {success:false, message: parsed.error.issues[0]?.message ?? "Invalid request"},
                {status:400}
            )
        }
        const {newPassword, code, email} = parsed.data

        const user = await UserModel.findOne({email})

        if(!user){
            return NextResponse.json({success:false,message:"User not found"},{status:404})
        }

        const isCodeValid = isOtpUnexpired(user.forgotPasswordExpiry)
        const isCodeSame = await verifyOtp(code, user.forgotPasswordCode)

        if(isCodeSame && isCodeValid){
            const salt = await bcrypt.genSalt(10)
            user.password = await bcrypt.hash(newPassword,salt)

            // Single-use: burn BOTH the code and its expiry. Clearing only the code
            // while leaving a future expiry would let an empty code replay the reset.
            user.forgotPasswordCode = ""
            user.forgotPasswordExpiry = new Date(0)

            await user.save()

            return NextResponse.json({success:true, message:"Password Changed Successfully"},{status:200})
        }
        if(!isCodeValid){
            return NextResponse.json({success:false, message:"Code expired — request a new reset code"},{status:410})
        }
        return NextResponse.json({success:false, message:"Wrong OTP code"},{status:400})
    } catch (error) {
        console.log("error from forgotPassword",error)
        return NextResponse.json({success:false,message:"Error while registering New Password"},{status:500})    }
}
