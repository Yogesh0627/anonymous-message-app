import { connectDB } from '@/dbConfig/db'
import FlaggedMessageModel from '@/models/flaggedMessage'
import UserModel from '@/models/user'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/admin'
import { logAudit } from '@/lib/audit'

const bodySchema = z.object({ decision: z.enum(['upheld', 'dismissed']) })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid input' }, { status: 400 })
  }

  await connectDB()
  const flagged = await FlaggedMessageModel.findOne({ _id: params.id, status: 'pending' })
  if (!flagged) {
    return NextResponse.json({ success: false, message: 'Not found or already reviewed' }, { status: 404 })
  }

  flagged.status = parsed.data.decision
  flagged.reviewedBy = admin._id as any
  flagged.reviewedAt = new Date()
  await flagged.save()

  // Upholding a flag against a known (logged-in) sender bans that account.
  let bannedSender = false
  if (parsed.data.decision === 'upheld' && flagged.senderId) {
    await UserModel.updateOne({ _id: flagged.senderId }, { $set: { isBanned: true } })
    bannedSender = true
  }

  await logAudit(admin, `moderation_${parsed.data.decision}`, 'flaggedMessage', params.id, {
    bannedSender,
  })

  return NextResponse.json({
    success: true,
    message: bannedSender ? 'Upheld and sender banned' : `Marked ${parsed.data.decision}`,
  })
}
