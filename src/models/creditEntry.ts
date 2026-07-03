import mongoose, { Document, Schema } from 'mongoose'

/**
 * Append-only credit ledger. `User.credits` is a denormalized balance; this
 * collection is the source of truth and is auditable.
 *
 * The unique index on (userId, reason, refId) provides exactly-once crediting:
 * the same logical event (e.g. "accepted plan X") can never double-credit, even
 * under retries or double-clicks. See DESIGN.md §16.
 */
export interface CreditEntry extends Document {
  userId: mongoose.Types.ObjectId
  delta: number
  reason: string
  refType: string
  refId: string
  createdAt: Date
}

const creditEntrySchema = new Schema<CreditEntry>({
  userId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
  delta: { type: Number, required: true },
  reason: { type: String, required: true },
  refType: { type: String, required: true },
  refId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

creditEntrySchema.index({ userId: 1, reason: 1, refId: 1 }, { unique: true })

const CreditEntryModel =
  (mongoose.models.creditEntries as mongoose.Model<CreditEntry>) ||
  mongoose.model<CreditEntry>('creditEntries', creditEntrySchema)

export default CreditEntryModel
