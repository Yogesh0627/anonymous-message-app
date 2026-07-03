import { connectDB } from '@/dbConfig/db'
import FlaggedMessageModel from '@/models/flaggedMessage'
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await getAdminSession()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const items = await FlaggedMessageModel.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()

  const flagged = items.map((f: any) => ({
    _id: String(f._id),
    recipientUsername: f.recipientUsername,
    hasSender: Boolean(f.senderId),
    content: f.content,
    category: f.category,
    reason: f.reason,
    createdAt: f.createdAt,
  }))

  return NextResponse.json({ success: true, message: 'Flagged messages', flagged })
}
