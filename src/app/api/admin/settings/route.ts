import { connectDB } from '@/dbConfig/db'
import AppSettingsModel, { getAppSettings } from '@/models/appSettings'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminSession } from '@/lib/admin'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = await getAdminSession()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  await connectDB()
  const settings = await getAppSettings()
  return NextResponse.json({
    success: true,
    settings: {
      registrationOpen: settings.registrationOpen,
      aiEnabled: settings.aiEnabled,
      maintenanceMode: settings.maintenanceMode,
    },
  })
}

const putSchema = z.object({
  registrationOpen: z.boolean().optional(),
  aiEnabled: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
})

export async function PUT(req: NextRequest) {
  const admin = await getAdminSession()
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  }

  const parsed = putSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid input' }, { status: 400 })
  }

  await connectDB()
  await AppSettingsModel.updateOne(
    { key: 'singleton' },
    { $set: { ...parsed.data, updatedAt: new Date() } },
    { upsert: true }
  )
  await logAudit(admin, 'updateSettings', 'appSettings', 'singleton', parsed.data)

  const settings = await getAppSettings()
  return NextResponse.json({
    success: true,
    message: 'Settings updated',
    settings: {
      registrationOpen: settings.registrationOpen,
      aiEnabled: settings.aiEnabled,
      maintenanceMode: settings.maintenanceMode,
    },
  })
}
