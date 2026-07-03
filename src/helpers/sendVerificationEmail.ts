import { resend } from "@/lib/resend";
import { env } from "@/lib/env";
import VerificationEmail from "../../emails/verificationEmail";
import { ApiResponse } from '@/types/APIResponse';

export async function sendVerificationEmail(
  email: string,
  username: string,
  verifyCode: string
): Promise<ApiResponse> {
  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject: 'Candor Verification Code',
      react: VerificationEmail({ username, otp: verifyCode }),
    });
    return { success: true, message: 'Verification email sent successfully.' };
  } catch (emailError) {
    console.error('Error sending verification email:', emailError);
    return { success: false, message: 'Failed to send verification email.' };
  }
}
