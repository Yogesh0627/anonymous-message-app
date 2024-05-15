import { connectDB } from './../../../dbConfig/db';
import { User, getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { NextRequest, NextResponse } from "next/server";
import UserModel from '@/models/user';
import mongoose from 'mongoose';


export async function GET(request:NextRequest){
    await connectDB()

    const session = await getServerSession(authOptions)

    const user:User = session?.user as User //assertion as User
    // console.log(user ,"user from get messages")
    if(!session || !session?.user){
        return NextResponse.json({success:false,msg:"Not Authorized"},{status:500})
    }

    const userId = new mongoose.Types.ObjectId(user._id)

    try {
        const user = await UserModel.aggregate([
            {$match:{_id:userId}},
            {$unwind:'$messages'},
            {$sort:{'messages.createdAt':-1}},
            {$group:{_id:'$_id',messages:{$push:"$messages"}}}
        ])

        // console.log(user,"user from get messages")
        if(!user || user.length === 0){
            // console.log("Failed to get-messages")
            return NextResponse.json({success:false,message:"User not found / No messages found "},{status:404})
    
        }
        return NextResponse.json({success:true,message:"fetched messages",messages:user[0].messages},{status:200})

    } catch (error:any) {
        // console.log("Failed to get-messages")
        // console.log(`error from, get-messages`,error.message)
        return NextResponse.json({success:false,message:"Internal server error"},{status:504})

    }
}