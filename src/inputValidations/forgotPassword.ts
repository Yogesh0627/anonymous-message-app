import { z } from "zod";

export const forgotPasswordValidationSchema = z.object({
  code: z.string().length(6, "Forgot Password code must be 6 digits"),
  newPassword: z
    .string()
    .min(6, "Password should be minimum 6 characters long")
    .max(10, "Password should be maximum 10 characters long")
    .regex(
      /^(?=.*\d)(?=.*[!@#$%^&*()-_=+\\|{}[\]:";'<>?,./])(?=.*[a-zA-Z]).{6,10}$/,
      "Password must contain at least one number, one special character, and include letters."
    ),
  confirmPassword: z
    .string()
    .min(6, "Password should be minimum 6 characters long")
    .max(10, "Password should be maximum 10 characters long")
}).refine((data)=>data.newPassword===data.confirmPassword,{
    message:"Password doesn't match",
    path:["confirmPassword"]
})

export const emailValidficationSchema = z.object({
    email : z.string().email({message:"invalid email address"}),
})