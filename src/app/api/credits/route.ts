import { connectDB } from '@/dbConfig/db'
import { authOptions } from '../auth/[...nextauth]/options'
import { getServerSession, User } from 'next-auth'
import { NextResponse } from 'next/server'
import { getBalance, getRecentEntries } from '@/lib/credits'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as User | undefined
  if (!session || !user?._id) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  }

  await connectDB()

  const [balance, entries] = await Promise.all([
    getBalance(user._id),
    getRecentEntries(user._id, 10),
  ])

  const recent = entries.map((e: any) => ({
    delta: e.delta,
    reason: e.reason,
    createdAt: e.createdAt,
  }))

  return NextResponse.json({ success: true, message: 'Credits fetched', balance, recent })
}
