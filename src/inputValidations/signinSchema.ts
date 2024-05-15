import {z} from 'zod'

export const signinValidationSchema = z.object({
    email : z.string().email({message:"invalid email address"}),
    password : z.string().min(6,{message:"Password must be atleast 6 characters"})
    .max(15,{message:"Passowrd must less than 15 characters"})
   .regex(
        /^(?=.*\d)(?=.*[!@#$%^&*()\-_=+\\\|{}\[\]:;"'<>,.?\/])(?=.*[a-z])(?=.*[A-Z]).{6,10}$/,
        "Password must contain at least one number, one special character, one lowercase letter, and one uppercase letter."
      ),

})