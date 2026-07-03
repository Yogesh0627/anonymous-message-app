import { connectDB } from '@/dbConfig/db'
import { getAppSettings } from '@/models/appSettings'
import { NextResponse } from 'next/server'

/**
 * Runtime enforcement of the admin feature flags (DESIGN.md admin part).
 * Read live on each request so an admin toggle takes effect immediately — no
 * caching, no redeploy. Each returns a ready-to-send 503 response when the
 * feature is off, or null when it's allowed.
 */

export async function aiDisabledResponse(): Promise<NextResponse | null> {
  await connectDB()
  const settings = await getAppSettings()
  if (!settings.aiEnabled) {
    return NextResponse.json(
      { success: false, message: 'AI features are currently disabled by the administrator.' },
      { status: 503 }
    )
  }
  return null
}

export async function maintenanceResponse(): Promise<NextResponse | null> {
  await connectDB()
  const settings = await getAppSettings()
  if (settings.maintenanceMode) {
    return NextResponse.json(
      { success: false, message: 'The app is under maintenance. Please try again shortly.' },
      { status: 503 }
    )
  }
  return null
}
