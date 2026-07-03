import { authOptions } from '../auth/[...nextauth]/options'
import { getServerSession, User } from 'next-auth'
import { NextResponse } from 'next/server'
import { getQuotaStatus } from '@/lib/quota'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as User | undefined
  if (!session || !user?._id) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  }

  const quota = await getQuotaStatus(String(user._id))
  return NextResponse.json({ success: true, quota })
}
