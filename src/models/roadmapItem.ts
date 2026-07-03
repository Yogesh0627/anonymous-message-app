import mongoose, { Document, Schema } from 'mongoose'

/**
 * A planned / in-progress / shipped feature shown on the product roadmap.
 * Managed by admins; the public roadmap shows only `isPublic` items.
 */
export interface RoadmapItem extends Document {
  title: string
  description: string
  status: 'planned' | 'in_progress' | 'shipped'
  targetVersion: string
  isPublic: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const roadmapItemSchema = new Schema<RoadmapItem>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['planned', 'in_progress', 'shipped'], default: 'planned' },
  targetVersion: { type: String, default: '' },
  isPublic: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

const RoadmapItemModel =
  (mongoose.models.roadmapItems as mongoose.Model<RoadmapItem>) ||
  mongoose.model<RoadmapItem>('roadmapItems', roadmapItemSchema)

export default RoadmapItemModel
