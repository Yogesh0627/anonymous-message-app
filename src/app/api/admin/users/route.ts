import { connectDB } from '@/dbConfig/db'
import UserModel from '@/models/user'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

export async function GET(req: NextRequest) {
  const admin = await getAdminSession()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const match = q
    ? { $or: [{ username: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }] }
    : {}

  const [users, total] = await Promise.all([
    UserModel.aggregate([
      { $match: match },
      { $sort: { _id: -1 } },
      { $skip: (page - 1) * PAGE_SIZE },
      { $limit: PAGE_SIZE },
      {
        $project: {
          username: 1,
          email: 1,
          isVerified: 1,
          isBanned: 1,
          role: 1,
          credits: 1,
          messageCount: { $size: { $ifNull: ['$messages', []] } },
        },
      },
    ]),
    UserModel.countDocuments(match),
  ])

  return NextResponse.json({
    success: true,
    message: 'Users fetched',
    users: users.map((u) => ({ ...u, _id: String(u._id) })),
    page,
    pageSize: PAGE_SIZE,
    total,
  })
}
