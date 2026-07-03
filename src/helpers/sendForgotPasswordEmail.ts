import { resend } from "@/lib/resend";
import { env } from "@/lib/env";
import { ApiResponse } from '@/types/APIResponse';
import ForgotPassword from "../../emails/forgoPasswordEmail";

export async function sendForgotPasswordEmail(
  email: string,
  username: string,
  verifyCode: string
): Promise<ApiResponse> {
  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject: 'Candor Password Reset',
      react: ForgotPassword({ username, otp: verifyCode }),
    });
    return { success: true, message: 'Reset password email sent successfully.' };
  } catch (emailError) {
    console.error('Error sending verification email:', emailError);
    return { success: false, message: 'Failed to send verification email.' };
  }
}
