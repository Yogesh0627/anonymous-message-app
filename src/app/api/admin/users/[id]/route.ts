import { connectDB } from '@/dbConfig/db'
import UserModel from '@/models/user'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { getAdminSession } from '@/lib/admin'
import { logAudit } from '@/lib/audit'
import { award } from '@/lib/credits'
import { CREDIT_REASONS } from '@/lib/creditRules'

const bodySchema = z.object({
  action: z.enum(['ban', 'unban', 'verify', 'setRole', 'adjustCredits', 'delete']),
  role: z.enum(['user', 'admin']).optional(),
  amount: z.number().int().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid input' }, { status: 400 })
  }

  const { action } = parsed.data
  const targetId = params.id
  const isSelf = String(admin._id) === targetId

  // Guard against an admin locking themselves out.
  if (isSelf && ['ban', 'delete', 'setRole'].includes(action)) {
    return NextResponse.json(
      { success: false, message: "You can't perform this action on your own account." },
      { status: 400 }
    )
  }

  await connectDB()
  const user = await UserModel.findById(targetId)
  if (!user) {
    return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
  }

  switch (action) {
    case 'ban':
      user.isBanned = true
      break
    case 'unban':
      user.isBanned = false
      break
    case 'verify':
      user.isVerified = true
      break
    case 'setRole':
      if (!parsed.data.role) {
        return NextResponse.json({ success: false, message: 'role is required' }, { status: 400 })
      }
      user.role = parsed.data.role
      break
    case 'adjustCredits': {
      if (parsed.data.amount === undefined || parsed.data.amount === 0) {
        return NextResponse.json({ success: false, message: 'amount is required' }, { status: 400 })
      }
      // Route through the ledger so the balance stays auditable.
      await award(targetId, CREDIT_REASONS.ADMIN_ADJUST, randomUUID(), {
        delta: parsed.data.amount,
      })
      await logAudit(admin, 'adjustCredits', 'user', targetId, { amount: parsed.data.amount })
      return NextResponse.json({ success: true, message: 'Credits adjusted' })
    }
    case 'delete':
      await UserModel.deleteOne({ _id: targetId })
      await logAudit(admin, 'delete', 'user', targetId, { username: user.username })
      return NextResponse.json({ success: true, message: 'User deleted' })
  }

  await user.save()
  await logAudit(admin, action, 'user', targetId, { username: user.username, role: parsed.data.role })

  return NextResponse.json({ success: true, message: `Action "${action}" applied` })
}
