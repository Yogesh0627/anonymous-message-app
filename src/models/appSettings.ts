import mongoose, { Document, Schema } from 'mongoose'

/**
 * Singleton application settings / feature flags controlled from the admin panel.
 * Always accessed via getAppSettings() which upserts the single document.
 */
export interface AppSettings extends Document {
  key: string // always "singleton"
  registrationOpen: boolean
  aiEnabled: boolean
  maintenanceMode: boolean
  updatedAt: Date
}

const appSettingsSchema = new Schema<AppSettings>({
  key: { type: String, required: true, unique: true, default: 'singleton' },
  registrationOpen: { type: Boolean, default: true },
  aiEnabled: { type: Boolean, default: true },
  maintenanceMode: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
})

const AppSettingsModel =
  (mongoose.models.appSettings as mongoose.Model<AppSettings>) ||
  mongoose.model<AppSettings>('appSettings', appSettingsSchema)

/**
 * Returns the settings doc, creating it with defaults on first access.
 * Atomic upsert so concurrent first-requests can't race into a duplicate-key
 * error on the unique `key`.
 */
export async function getAppSettings(): Promise<AppSettings> {
  return AppSettingsModel.findOneAndUpdate(
    { key: 'singleton' },
    { $setOnInsert: { key: 'singleton' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

export default AppSettingsModel
