import { connectDB } from '@/dbConfig/db'
import UserModel from '@/models/user'
import FlaggedMessageModel from '@/models/flaggedMessage'
import GrowthPlanModel from '@/models/growthPlan'
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await getAdminSession()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const [agg] = await UserModel.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        verified: { $sum: { $cond: ['$isVerified', 1, 0] } },
        banned: { $sum: { $cond: ['$isBanned', 1, 0] } },
        admins: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
        totalMessages: { $sum: { $size: { $ifNull: ['$messages', []] } } },
        totalCredits: { $sum: { $ifNull: ['$credits', 0] } },
      },
    },
  ])

  const [pendingFlags, growthPlans] = await Promise.all([
    FlaggedMessageModel.countDocuments({ status: 'pending' }),
    GrowthPlanModel.countDocuments({}),
  ])

  return NextResponse.json({
    success: true,
    stats: {
      totalUsers: agg?.totalUsers ?? 0,
      verified: agg?.verified ?? 0,
      banned: agg?.banned ?? 0,
      admins: agg?.admins ?? 0,
      totalMessages: agg?.totalMessages ?? 0,
      totalCredits: agg?.totalCredits ?? 0,
      pendingFlags,
      growthPlans,
    },
  })
}
