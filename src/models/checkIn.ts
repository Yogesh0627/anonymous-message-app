import mongoose, { Document, Schema } from 'mongoose'

/**
 * A daily check-in against a growth plan: a short note plus a self-rating (mood).
 * The unique (growthPlanId, date) index enforces one check-in per day — which
 * also makes the "+10 credits/day" impossible to farm. See DESIGN.md §14.
 */
export interface CheckIn extends Document {
  userId: mongoose.Types.ObjectId
  growthPlanId: mongoose.Types.ObjectId
  date: string // YYYY-MM-DD
  note: string
  mood: number // 1..5
  createdAt: Date
}

const checkInSchema = new Schema<CheckIn>({
  userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
  growthPlanId: { type: Schema.Types.ObjectId, ref: 'growthPlans', required: true },
  date: { type: String, required: true },
  note: { type: String, required: true },
  mood: { type: Number, required: true, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now },
})

checkInSchema.index({ growthPlanId: 1, date: 1 }, { unique: true })

const CheckInModel =
  (mongoose.models.checkIns as mongoose.Model<CheckIn>) ||
  mongoose.model<CheckIn>('checkIns', checkInSchema)

export default CheckInModel
