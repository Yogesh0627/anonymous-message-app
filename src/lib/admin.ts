import { getServerSession, User } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/options'

export type AdminUser = User & { _id: string; role: 'admin' }

/**
 * Returns the current admin user, or null. Every admin API route must call this
 * and reject on null — authorization is enforced server-side, never by merely
 * hiding UI. Middleware also gates /admin, but defense-in-depth matters.
 */
export async function getAdminSession(): Promise<AdminUser | null> {
  const session = await getServerSession(authOptions)
  const user = session?.user as (User & { role?: string }) | undefined
  if (!user?._id || user.role !== 'admin') return null
  return user as AdminUser
}
