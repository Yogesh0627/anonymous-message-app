import { connectDB } from './../../../dbConfig/db';
import { User, getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { NextRequest, NextResponse } from "next/server";
import UserModel from '@/models/user';
import mongoose from 'mongoose';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    await connectDB()

    const session = await getServerSession(authOptions)
    const user = session?.user as User

    if (!session || !user) {
        return NextResponse.json(
            { success: false, message: "Not authenticated" },
            { status: 401 }
        )
    }

    const userId = new mongoose.Types.ObjectId(user._id)

    // Sorting + pagination controls (safe defaults, bounded).
    const { searchParams } = new URL(request.url)
    const sortDir = searchParams.get('sort') === 'oldest' ? 1 : -1
    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '6') || 6))
    const skip = (page - 1) * limit

    try {
        const [result] = await UserModel.aggregate([
            { $match: { _id: userId } },
            { $project: { messages: { $ifNull: ['$messages', []] } } },
            { $unwind: '$messages' },
            { $sort: { 'messages.createdAt': sortDir } },
            {
                $facet: {
                    // Page slice — projected to safe fields only (senderId is never
                    // exposed to the recipient).
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $replaceRoot: {
                                newRoot: {
                                    _id: '$messages._id',
                                    content: '$messages.content',
                                    createdAt: '$messages.createdAt',
                                },
                            },
                        },
                    ],
                    meta: [{ $count: 'total' }],
                },
            },
        ])

        const messages = result?.data ?? []
        const total = result?.meta?.[0]?.total ?? 0

        return NextResponse.json(
            { success: true, message: "Messages fetched", messages, total, page, pageSize: limit },
            { status: 200 }
        )
    } catch (error) {
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        )
    }
}
