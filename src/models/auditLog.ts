import mongoose, { Document, Schema } from 'mongoose'

/**
 * Append-only record of every admin action. Provides accountability — who did
 * what, to whom, when. See DESIGN.md (admin part).
 */
export interface AuditLog extends Document {
  adminId: mongoose.Types.ObjectId
  adminUsername: string
  action: string
  targetType: string
  targetId: string
  meta?: Record<string, unknown>
  createdAt: Date
}

const auditLogSchema = new Schema<AuditLog>({
  adminId: { type: Schema.Types.ObjectId, ref: 'users', required: true, index: true },
  adminUsername: { type: String, required: true },
  action: { type: String, required: true },
  targetType: { type: String, required: true },
  targetId: { type: String, required: true },
  meta: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
})

const AuditLogModel =
  (mongoose.models.auditLogs as mongoose.Model<AuditLog>) ||
  mongoose.model<AuditLog>('auditLogs', auditLogSchema)

export default AuditLogModel
