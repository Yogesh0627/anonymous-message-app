import mongoose, { Document, Schema } from 'mongoose'

/**
 * A growth plan the user accepted from the AI coach. Tasks are trackable; the
 * plan progresses active → completed (all tasks done) → (loop-back in Part 2d).
 * See DESIGN.md §13.
 */
export interface GrowthTask {
  id: string
  title: string
  done: boolean
  doneAt?: Date
}

export interface GrowthPlan extends Document {
  userId: mongoose.Types.ObjectId
  sourceMessageIds: mongoose.Types.ObjectId[]
  title: string
  summary: string
  tasks: GrowthTask[]
  status: 'active' | 'completed' | 'archived'
  createdAt: Date
  acceptedAt: Date
  completedAt?: Date
}

const taskSchema = new Schema<GrowthTask>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    done: { type: Boolean, default: false },
    doneAt: { type: Date },
  },
  { _id: false }
)

const growthPlanSchema = new Schema<GrowthPlan>({
  userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
  sourceMessageIds: [{ type: Schema.Types.ObjectId }],
  title: { type: String, required: true },
  summary: { type: String, default: '' },
  tasks: { type: [taskSchema], default: [] },
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
})

const GrowthPlanModel =
  (mongoose.models.growthPlans as mongoose.Model<GrowthPlan>) ||
  mongoose.model<GrowthPlan>('growthPlans', growthPlanSchema)

export default GrowthPlanModel
