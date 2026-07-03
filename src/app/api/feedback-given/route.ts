import { connectDB } from '@/dbConfig/db'
import ChangeConfirmationModel from '@/models/changeConfirmation'
import UserModel from '@/models/user'
import { authOptions } from '../auth/[...nextauth]/options'
import { getServerSession, User } from 'next-auth'
import { NextResponse } from 'next/server'

// Ensure the referenced model is registered for populate().
void UserModel

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as User | undefined
  if (!session || !user?._id) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  }

  await connectDB()

  const confirmations = await ChangeConfirmationModel.find({
    senderId: user._id,
    status: 'pending',
  })
    .populate('receiverId', 'username')
    .sort({ requestedAt: -1 })
    .lean()

  // The sender already knows who they sent feedback to, so showing the recipient
  // username here does not break anonymity (which protects the sender, not the
  // recipient).
  const requests = confirmations.map((c: any) => ({
    _id: String(c._id),
    receiverUsername: c.receiverId?.username ?? 'someone',
    requestedAt: c.requestedAt,
  }))

  return NextResponse.json({ success: true, message: 'Requests fetched', requests })
}
