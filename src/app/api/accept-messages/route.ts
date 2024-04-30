import { connectDB } from './../../../dbConfig/db';
import { User, getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { NextRequest, NextResponse } from "next/server";
import UserModel from '@/models/user';

export async function POST(request:NextRequest){
    await connectDB()

    const session = await getServerSession(authOptions)

    const user:User = session?.user as User //assertion as User

    if(!session || !session?.user){
        return NextResponse.json({success:false,msg:"Not Authorized"},{status:500})
    }

    const userId = user._id
    const {acceptingMessages} = await request.json()
    // console.log("from accept-messages route",acceptingMessages)

    try {
       
        const updatedUser = await UserModel.findByIdAndUpdate(userId,{isAcceptingMessage:acceptingMessages},{new:true})
        if(!updatedUser){
            return NextResponse.json({success:false,message:"Failed to update the user status to accept messages"},{status:401})
        }
        return NextResponse.json({success:true,message:"Message Acceptance updated successfully",updatedUser},{status:201})
    } catch (error:any) {
        // console.log("Failed to update the user status to accept messages")
        // console.log(`error from, accept messages`,error.message)
        return NextResponse.json({success:false,message:"Failed to update the user status to accept messages"},{status:404})

    }
}

export async function GET(request:NextRequest){
    await connectDB()

    const session = await getServerSession(authOptions)
    const user:User = session?.user as User // as User is assertion

    if(!session || !session?.user){
        return NextResponse.json({success:false,message:"Not Authorized"},{status:500})
    }

    const userId = user._id
    
    try {
        const foundUser = await UserModel.findById(userId)
        if(!foundUser){
            return NextResponse.json({success:false,msg:"Failed to found user"},{status:404})
        }
        return NextResponse.json({success:true,isAcceptingMessages:foundUser.isAcceptingMessage},{status:201})

        
    }catch (error:any) {
        // console.log("Failed to found user")
        // console.log(`error from, accept messages`,error.message)
        return NextResponse.json({success:false,msg:"Failed to find user"},{status:500})

    }
}