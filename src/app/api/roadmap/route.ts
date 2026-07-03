import { connectDB } from '@/dbConfig/db'
import RoadmapItemModel from '@/models/roadmapItem'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Public, read-only. Only items marked isPublic are exposed.
export async function GET() {
  await connectDB()
  const items = await RoadmapItemModel.find({ isPublic: true })
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean()

  const roadmap = items.map((i: any) => ({
    _id: String(i._id),
    title: i.title,
    description: i.description,
    status: i.status,
    targetVersion: i.targetVersion,
  }))

  return NextResponse.json({ success: true, roadmap })
}
