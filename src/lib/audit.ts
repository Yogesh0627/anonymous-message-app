import AuditLogModel from '@/models/auditLog'
import type { AdminUser } from '@/lib/admin'

/** Records an admin action. Never throws into the caller — logging must not
 * block the action it describes. */
export async function logAudit(
  admin: AdminUser,
  action: string,
  targetType: string,
  targetId: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    await AuditLogModel.create({
      adminId: admin._id,
      adminUsername: (admin as any).username ?? 'admin',
      action,
      targetType,
      targetId,
      meta,
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}
