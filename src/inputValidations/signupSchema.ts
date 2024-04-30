import {z} from "zod";


export const signupValidationSchema=  z.object({
    username : z.string()
    .min(3,"Username must be atleast 3 characters")
    .max(10,"Username must not be greater than 15 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username must not contain special characters"),
    email : z.string().email({message:"invalid email address"}),
    password : z.string().min(6,{message:"Password must be atleast 6 characters"}),
    confirmPassword: z
    .string()
    .min(6, "Password should be minimum 6 characters long")
    .max(10, "Password should be maximum 10 characters long")
}).refine((data)=>data.password===data.confirmPassword,{
    message:"Password doesn't match",
    path:["confirmPassword"]
})