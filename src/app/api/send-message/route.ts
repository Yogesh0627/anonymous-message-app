import { connectDB } from "@/dbConfig/db";
import UserModel, { Message } from "@/models/user";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession, User } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { messageValidationSchema } from "@/inputValidations/messageSchema";
import { usernameValidation } from "@/inputValidations/usernameValidation";
import { enforceRateLimit } from "@/lib/rateLimit";
import { moderateMessage } from "@/lib/moderation";
import { maintenanceResponse } from "@/lib/featureGuards";
import FlaggedMessageModel from "@/models/flaggedMessage";
import { award, underDailyCap } from "@/lib/credits";
import { CREDIT_REASONS } from "@/lib/creditRules";
import { z } from "zod";

const sendMessageSchema = z.object({
  username: usernameValidation,
  content: messageValidationSchema.shape.content,
});

export async function POST(request: NextRequest) {
  // Anonymous endpoint — cap how fast one client can spam messages.
  const limited = await enforceRateLimit(request, "send-message", {
    limit: 5,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const maintenance = await maintenanceResponse();
  if (maintenance) return maintenance;

  await connectDB();

  const parsed = sendMessageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { username, content } = parsed.data;

  try {
    // Resolve current usernames first, then fall back to a previously-held name
    // so links shared before a rename still reach the right person.
    const user =
      (await UserModel.findOne({ username, isVerified: true })) ??
      (await UserModel.findOne({ previousUsernames: username, isVerified: true }));

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (!user.isAcceptingMessage) {
      return NextResponse.json(
        { success: false, message: "This user is not accepting messages" },
        { status: 403 }
      );
    }

    // Identify a logged-in sender (hidden from the recipient; used for credits
    // and loop-back). Block self-feedback outright to prevent credit farming.
    const session = await getServerSession(authOptions);
    const senderId = (session?.user as User | undefined)?._id;
    if (senderId && String(senderId) === String(user._id)) {
      return NextResponse.json(
        { success: false, message: "You can't send feedback to yourself." },
        { status: 400 }
      );
    }

    // AI safety gate: reject abusive content before it ever reaches the inbox.
    const moderation = await moderateMessage(content);
    if (moderation.flagged) {
      // Persist for admin moderation review instead of storing in the inbox.
      await FlaggedMessageModel.create({
        recipientId: user._id,
        recipientUsername: user.username,
        ...(senderId ? { senderId } : {}),
        content,
        category: moderation.category,
        reason: moderation.reason,
        status: "pending",
      });
      return NextResponse.json(
        {
          success: false,
          message:
            "This message was blocked because it may contain harmful or abusive content.",
        },
        { status: 422 }
      );
    }

    user.messages.push({
      content,
      createdAt: new Date(),
      ...(senderId ? { senderId } : {}),
    } as Message);
    await user.save();

    const created = user.messages[user.messages.length - 1];
    const messageId = String(created._id);

    // Credit the recipient for receiving feedback (idempotent per message).
    await award(user._id as any, CREDIT_REASONS.RECEIVE_FEEDBACK, messageId);

    // Credit a logged-in sender, subject to the daily anti-farming cap.
    if (senderId && (await underDailyCap(senderId, CREDIT_REASONS.GIVE_FEEDBACK))) {
      await award(senderId, CREDIT_REASONS.GIVE_FEEDBACK, messageId);
    }

    return NextResponse.json(
      { success: true, message: "Message sent successfully" },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to send message" },
      { status: 500 }
    );
  }
}
