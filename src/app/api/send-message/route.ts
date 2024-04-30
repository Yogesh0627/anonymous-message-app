import { connectDB } from "@/dbConfig/db";
import UserModel from "@/models/user";
import {Message} from "@/models/user"
import { NextRequest, NextResponse } from "next/server";


export async function POST(request:NextRequest){

    await connectDB()

    const {username,content} = await request.json()
    // console.log(username,content)
    try {
        const user = await UserModel.findOne({username})

        if(!user){
            // console.log("Failed to found user from send-message")
            return NextResponse.json({success:false,message:"Failed to find user"},{status:404})    
        }

        // is User accepting messages

        if (!user.isAcceptingMessage){
            // console.log("Failed to found user")
            return NextResponse.json({success:false,message:"User not accepting messages"},{status:403})
        }

        const message={
            content,
            createdAt:new Date()
        }
        user.messages.push(message as Message)
        
        await user.save()

        return NextResponse.json({success:true,message:"message sent successfully"},{status:200})

    } catch (error:any) {
        // console.log("Failed to found user")
        // console.log(`error from, send messages`,error.message)
        return NextResponse.json({success:false,msg:"Failed to found user"},{status:404})

    }
}