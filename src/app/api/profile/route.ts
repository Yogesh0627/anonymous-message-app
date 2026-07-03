import { connectDB } from '@/dbConfig/db'
import { authOptions } from '../auth/[...nextauth]/options'
import { getServerSession, User } from 'next-auth'
import { NextResponse } from 'next/server'
import UserModel from '@/models/user'
import { usernameValidation } from '@/inputValidations/usernameValidation'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({ username: usernameValidation })

// Rolling limit: at most 3 username changes in any 365-day window.
const MAX_USERNAME_CHANGES = 3
const CHANGE_WINDOW_MS = 365 * 24 * 60 * 60 * 1000

/** Prune change timestamps to the active window and compute the allowance. */
function allowance(changes: Date[] | undefined, isAdmin: boolean) {
  const now = Date.now()
  const recent = (changes ?? [])
    .map((d) => new Date(d))
    .filter((d) => now - d.getTime() < CHANGE_WINDOW_MS)
    .sort((a, b) => a.getTime() - b.getTime())
  const remaining = isAdmin ? Infinity : Math.max(0, MAX_USERNAME_CHANGES - recent.length)
  const nextChangeAt =
    !isAdmin && recent.length >= MAX_USERNAME_CHANGES && recent[0]
      ? new Date(recent[0].getTime() + CHANGE_WINDOW_MS)
      : null
  return { recent, remaining, nextChangeAt }
}

async function requireUser() {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as User | undefined
  if (!session || !sessionUser?._id) return null
  return sessionUser
}

// Report how many username changes the user has left this year (for the UI).
export async function GET() {
  const sessionUser = await requireUser()
  if (!sessionUser) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  }
  await connectDB()
  const me = await UserModel.findById(sessionUser._id).select('role usernameChanges')
  if (!me) return NextResponse.json({ success: false, message: 'Account not found' }, { status: 404 })

  const isAdmin = me.role === 'admin'
  const { remaining, nextChangeAt } = allowance(me.usernameChanges, isAdmin)
  return NextResponse.json({
    success: true,
    maxChanges: MAX_USERNAME_CHANGES,
    changesRemaining: isAdmin ? null : remaining, // null = unlimited (admin)
    nextChangeAt,
  })
}

// Change the signed-in user's username (with uniqueness + rolling-cap guards).
export async function PATCH(request: Request) {
  const sessionUser = await requireUser()
  if (!sessionUser) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.format().username?._errors?.join(', ') || 'Invalid username'
    return NextResponse.json({ success: false, message: msg }, { status: 400 })
  }
  const username = parsed.data.username.trim()

  await connectDB()

  const me = await UserModel.findById(sessionUser._id).select(
    'username previousUsernames usernameChanges role'
  )
  if (!me) {
    return NextResponse.json({ success: false, message: 'Account not found' }, { status: 404 })
  }
  if (me.username === username) {
    return NextResponse.json({ success: true, message: 'Username unchanged', username })
  }

  const isAdmin = me.role === 'admin'

  // Rolling-cap check (admins are exempt).
  const { recent, remaining, nextChangeAt } = allowance(me.usernameChanges, isAdmin)
  if (!isAdmin && remaining <= 0) {
    return NextResponse.json(
      {
        success: false,
        message: `You can only change your username ${MAX_USERNAME_CHANGES} times a year. You can change it again on ${nextChangeAt?.toLocaleDateString()}.`,
        nextChangeAt,
      },
      { status: 429 }
    )
  }

  // Case-insensitive collision guard against any active OR reserved name held by
  // *another* user, so a rename can't hijack a link someone else's history owns.
  // The validator restricts input to [a-zA-Z0-9_], so it's RegExp-safe.
  const rx = new RegExp(`^${username}$`, 'i')
  const taken = await UserModel.findOne({
    $or: [{ username: rx }, { previousUsernames: rx }],
    _id: { $ne: me._id },
  }).select('_id')
  if (taken) {
    return NextResponse.json({ success: false, message: 'That username is already taken' }, { status: 409 })
  }

  // Reserve the outgoing name (keeps old links working); if the user is
  // reclaiming one of their own past names, drop it from the reserved list.
  const oldUsername = me.username
  me.previousUsernames = Array.from(
    new Set([...(me.previousUsernames ?? []), oldUsername].filter((n) => n !== username))
  )
  me.username = username
  me.usernameChanges = [...recent, new Date()] // pruned history + this change
  try {
    await me.save()
  } catch (e: any) {
    // Unique-index race between the check above and save.
    if (e?.code === 11000) {
      return NextResponse.json({ success: false, message: 'That username is already taken' }, { status: 409 })
    }
    return NextResponse.json({ success: false, message: 'Could not update username' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Username updated',
    username,
    changesRemaining: isAdmin ? null : remaining - 1,
  })
}
