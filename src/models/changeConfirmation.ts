import mongoose, { Document, Schema } from 'mongoose'

/**
 * A "did you notice a change?" request sent to a logged-in sender after the
 * recipient completes a growth plan. On confirmation both parties are credited.
 * The sender's identity is never revealed to the recipient. See DESIGN.md §15.
 */
export interface ChangeConfirmation extends Document {
  messageId: mongoose.Types.ObjectId
  growthPlanId: mongoose.Types.ObjectId
  senderId: mongoose.Types.ObjectId
  receiverId: mongoose.Types.ObjectId
  status: 'pending' | 'confirmed' | 'declined'
  requestedAt: Date
  respondedAt?: Date
}

const changeConfirmationSchema = new Schema<ChangeConfirmation>({
  messageId: { type: Schema.Types.ObjectId, required: true },
  growthPlanId: { type: Schema.Types.ObjectId, ref: 'growthPlans', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
  status: { type: String, enum: ['pending', 'confirmed', 'declined'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date },
})

// One confirmation request per (plan, sender).
changeConfirmationSchema.index({ growthPlanId: 1, senderId: 1 }, { unique: true })

const ChangeConfirmationModel =
  (mongoose.models.changeConfirmations as mongoose.Model<ChangeConfirmation>) ||
  mongoose.model<ChangeConfirmation>('changeConfirmations', changeConfirmationSchema)

export default ChangeConfirmationModel
