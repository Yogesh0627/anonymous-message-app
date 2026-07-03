import { z } from "zod";
import { usernameValidation } from "@/inputValidations/usernameValidation";
import { passwordValidation } from "@/inputValidations/passwordValidation";

export const signupValidationSchema = z
  .object({
    username: usernameValidation,
    email: z.string().email({ message: "Invalid email address" }),
    password: passwordValidation,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
