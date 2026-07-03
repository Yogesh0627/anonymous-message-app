import { connectDB } from '@/dbConfig/db'
import RoadmapItemModel from '@/models/roadmapItem'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin'
import { logAudit } from '@/lib/audit'
import { updateRoadmapSchema } from '@/inputValidations/roadmapSchema'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })

  const parsed = updateRoadmapSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid input' }, { status: 400 })
  }

  await connectDB()
  const updated = await RoadmapItemModel.findByIdAndUpdate(
    params.id,
    { $set: { ...parsed.data, updatedAt: new Date() } },
    { new: true }
  )
  if (!updated) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
  }

  await logAudit(admin, 'roadmap_update', 'roadmapItem', params.id, parsed.data)
  return NextResponse.json({ success: true, message: 'Item updated', item: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })

  await connectDB()
  const deleted = await RoadmapItemModel.findByIdAndDelete(params.id)
  if (!deleted) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
  }

  await logAudit(admin, 'roadmap_delete', 'roadmapItem', params.id, { title: deleted.title })
  return NextResponse.json({ success: true, message: 'Item deleted' })
}
