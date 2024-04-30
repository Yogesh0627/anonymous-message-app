import {z} from 'zod'

export const signinValidationSchema = z.object({
    email : z.string().email({message:"invalid email address"}),
    password : z.string().min(6,{message:"Password must be atleast 6 characters"})
})