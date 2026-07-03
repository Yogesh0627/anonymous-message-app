import mongoose, { Document, Schema } from 'mongoose'

/**
 * A message the AI moderation blocked, persisted for admin review instead of the
 * recipient's inbox. This is the ONLY message content admins can see — private
 * (unflagged) inboxes are never exposed to admins. See DESIGN.md (admin part).
 */
export interface FlaggedMessage extends Document {
  recipientId: mongoose.Types.ObjectId
  recipientUsername: string
  senderId?: mongoose.Types.ObjectId // present only if a logged-in sender
  content: string
  category: string
  reason: string
  status: 'pending' | 'upheld' | 'dismissed'
  reviewedBy?: mongoose.Types.ObjectId
  reviewedAt?: Date
  createdAt: Date
}

const flaggedMessageSchema = new Schema<FlaggedMessage>({
  recipientId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
  recipientUsername: { type: String, required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'users' },
  content: { type: String, required: true },
  category: { type: String, default: 'none' },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'upheld', 'dismissed'], default: 'pending', index: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'users' },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
})

const FlaggedMessageModel =
  (mongoose.models.flaggedMessages as mongoose.Model<FlaggedMessage>) ||
  mongoose.model<FlaggedMessage>('flaggedMessages', flaggedMessageSchema)

export default FlaggedMessageModel
