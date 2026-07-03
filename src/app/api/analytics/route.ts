import { connectDB } from "@/dbConfig/db";
import UserModel from "@/models/user";
import { authOptions } from "../auth/[...nextauth]/options";
import { getServerSession, User } from "next-auth";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * Returns inbox analytics for the signed-in user:
 * - total message count
 * - a 7-day daily histogram (zero-filled) for a trend chart
 * - current accepting-messages status
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as User | undefined;

  if (!session || !sessionUser?._id) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 }
    );
  }

  await connectDB();
  const userId = new mongoose.Types.ObjectId(sessionUser._id);

  // Start of the day 6 days ago → a 7-day inclusive window.
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 6);

  try {
    const [result] = await UserModel.aggregate([
      { $match: { _id: userId } },
      {
        $project: {
          isAcceptingMessage: 1,
          total: { $size: { $ifNull: ["$messages", []] } },
          recent: {
            $filter: {
              input: { $ifNull: ["$messages", []] },
              as: "m",
              cond: { $gte: ["$$m.createdAt", since] },
            },
          },
        },
      },
      {
        $project: {
          isAcceptingMessage: 1,
          total: 1,
          daily: {
            $map: {
              input: "$recent",
              as: "m",
              in: {
                $dateToString: { format: "%Y-%m-%d", date: "$$m.createdAt" },
              },
            },
          },
        },
      },
    ]);

    // Zero-fill the 7-day window so the chart has no gaps.
    const buckets: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      buckets.push({ date: d.toISOString().slice(0, 10), count: 0 });
    }
    const index = new Map(buckets.map((b) => [b.date, b]));
    for (const day of result?.daily ?? []) {
      const bucket = index.get(day);
      if (bucket) bucket.count += 1;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Analytics fetched",
        analytics: {
          total: result?.total ?? 0,
          isAcceptingMessage: result?.isAcceptingMessage ?? false,
          last7Days: buckets,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to load analytics" },
      { status: 500 }
    );
  }
}
