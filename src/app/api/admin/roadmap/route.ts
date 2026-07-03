import { connectDB } from '@/dbConfig/db'
import RoadmapItemModel from '@/models/roadmapItem'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin'
import { logAudit } from '@/lib/audit'
import { createRoadmapSchema } from '@/inputValidations/roadmapSchema'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })

  await connectDB()
  const items = await RoadmapItemModel.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean()
  return NextResponse.json({
    success: true,
    items: items.map((i: any) => ({ ...i, _id: String(i._id) })),
  })
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })

  const parsed = createRoadmapSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  await connectDB()
  const item = await RoadmapItemModel.create(parsed.data)
  await logAudit(admin, 'roadmap_create', 'roadmapItem', String(item._id), { title: item.title })

  return NextResponse.json({ success: true, message: 'Item created', item }, { status: 201 })
}
