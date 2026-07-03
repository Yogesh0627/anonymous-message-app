import { connectDB } from '@/dbConfig/db'
import ChangeConfirmationModel from '@/models/changeConfirmation'
import { authOptions } from '../../auth/[...nextauth]/options'
import { getServerSession, User } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { award } from '@/lib/credits'
import { CREDIT_REASONS } from '@/lib/creditRules'

const bodySchema = z.object({ decision: z.enum(['confirmed', 'declined']) })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as User | undefined
  if (!session || !user?._id) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid input' }, { status: 400 })
  }

  await connectDB()

  // Only the sender who owns this pending request may respond.
  const confirmation = await ChangeConfirmationModel.findOne({
    _id: params.id,
    senderId: user._id,
    status: 'pending',
  })
  if (!confirmation) {
    return NextResponse.json(
      { success: false, message: 'Request not found or already answered' },
      { status: 404 }
    )
  }

  confirmation.status = parsed.data.decision
  confirmation.respondedAt = new Date()
  await confirmation.save()

  if (parsed.data.decision === 'confirmed') {
    // Reward both parties, idempotent on the confirmation id.
    await award(confirmation.receiverId, CREDIT_REASONS.CONFIRM_CHANGE_RECEIVER, String(confirmation._id))
    await award(confirmation.senderId, CREDIT_REASONS.CONFIRM_CHANGE_SENDER, String(confirmation._id))
  }

  return NextResponse.json(
    { success: true, message: parsed.data.decision === 'confirmed' ? 'Thanks — credits awarded!' : 'Thanks for responding.' },
    { status: 200 }
  )
}
