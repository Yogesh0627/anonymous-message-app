import { connectDB } from "@/dbConfig/db";
import { usernameValidation } from "@/inputValidations/usernameValidation";
import UserModel from "@/models/user";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";


const usernameQuerySchema = z.object({username:usernameValidation})

export async function GET(request:Request){

    await connectDB()

    try {

        const {searchParams} = new URL(request.url)

        const queryParams = {
            username: searchParams.get("username")
        }


        const result = usernameQuerySchema.safeParse(queryParams)
    
        // console.log("result after parsing",result)
        
        if(!result.success){
            const usernameErrors = result.error.format().username?._errors || []
            return Response.json( {
                success: false,
                message:
                  usernameErrors?.length > 0
                    ? usernameErrors.join(', ')
                    : 'Invalid query parameters',
              },
              { status: 400 })
        }

        const {username} = result.data

        const isUnique = await UserModel.findOne({username,isVerified:true})

        if(isUnique){
            return Response.json({success:false,message:"username already taken"},{status:400})
        }
        return Response.json({success:true,message:"username available"},{status:200})
    
    } catch (error:any) {
        // console.log(`Hello i am an error from check-username-unique`,error.message)
        return Response.json({success:false,message:"Error checking username"},{status:500})
    }
}
