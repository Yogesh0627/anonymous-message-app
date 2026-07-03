import { z } from "zod";
import { passwordValidation } from "@/inputValidations/passwordValidation";

export const forgotPasswordValidationSchema = z
  .object({
    code: z.string().length(6, "Reset code must be 6 digits"),
    newPassword: passwordValidation,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const emailValidficationSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});
