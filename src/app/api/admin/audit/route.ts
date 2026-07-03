import { connectDB } from '@/dbConfig/db'
import AuditLogModel from '@/models/auditLog'
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await getAdminSession()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const logs = await AuditLogModel.find({}).sort({ createdAt: -1 }).limit(50).lean()

  const entries = logs.map((l: any) => ({
    _id: String(l._id),
    adminUsername: l.adminUsername,
    action: l.action,
    targetType: l.targetType,
    targetId: l.targetId,
    meta: l.meta ?? {},
    createdAt: l.createdAt,
  }))

  return NextResponse.json({ success: true, entries })
}
