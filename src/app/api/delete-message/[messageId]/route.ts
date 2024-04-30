
import { User, getServerSession } from "next-auth";

import { NextRequest, NextResponse } from "next/server";
import UserModel from '@/models/user';
import mongoose from 'mongoose';
import { connectDB } from "@/dbConfig/db";
import { authOptions } from "../../auth/[...nextauth]/options";


export async function DELETE(request:NextRequest,{params}:{params:{messageId:string}}){
    const messageId = params.messageId
    await connectDB()

    const session = await getServerSession(authOptions)

    const user:User = session?.user as User //assertion as User

    if(!session || !session?.user){
        return NextResponse.json({success:false,msg:"Not Authorized"},{status:500})
    }

    try {
       const updatedResult= await UserModel.updateOne({_id:user._id},{$pull:{messages:{_id:messageId}}})
        
       if (updatedResult.modifiedCount === 0){
        // console.log("Failed to delete-message")
        // console.log()
        return NextResponse.json({success:false,msg:"Message not found"},{status:404})

       }
       return NextResponse.json({success:true,message:"message deleted sucessfully"},{status:200})
    } catch (error:any) {
        // console.log("Failed to delete-message")
        // console.log(`error from, delete-messages`,error.message)
        return NextResponse.json({success:false,msg:"Failed to delete-messages"},{status:500})

    }


}