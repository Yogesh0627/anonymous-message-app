/**
 * Pure credit-economy configuration (no I/O) so the earn/spend amounts, daily
 * caps, and redemption bundles are unit-testable and live in one place.
 * See DESIGN.md §16–17.
 */

export const CREDIT_REASONS = {
  GIVE_FEEDBACK: 'give_feedback',
  RECEIVE_FEEDBACK: 'receive_feedback',
  ACCEPT_PLAN: 'accept_plan',
  DAILY_CHECKIN: 'daily_checkin',
  CONFIRM_CHANGE_RECEIVER: 'confirm_change_receiver',
  CONFIRM_CHANGE_SENDER: 'confirm_change_sender',
  REDEEM_AI: 'redeem_ai',
  ADMIN_ADJUST: 'admin_adjust',
} as const

export type CreditReason = (typeof CREDIT_REASONS)[keyof typeof CREDIT_REASONS]

/** Credits awarded per earn action (positive). Debits are computed separately. */
export const CREDIT_AMOUNTS: Record<CreditReason, number> = {
  give_feedback: 30,
  receive_feedback: 20,
  accept_plan: 5,
  daily_checkin: 10,
  confirm_change_receiver: 20,
  confirm_change_sender: 10,
  redeem_ai: 0,
  admin_adjust: 0,
}

/** Max times per day an action can earn credits (anti-farming). */
export const DAILY_ACTION_CAPS: Partial<Record<CreditReason, number>> = {
  give_feedback: 5,
}

/** Credit → AI-quota redemption bundles. */
export const REDEEM_BUNDLES = {
  ai_calls_10: { credits: 50, aiCalls: 10 },
  ai_calls_25: { credits: 100, aiCalls: 25 },
} as const

export type RedeemBundle = keyof typeof REDEEM_BUNDLES

export function isRedeemBundle(value: string): value is RedeemBundle {
  return value in REDEEM_BUNDLES
}
