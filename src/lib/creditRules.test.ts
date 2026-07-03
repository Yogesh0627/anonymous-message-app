import { describe, it, expect } from 'vitest'
import {
  CREDIT_AMOUNTS,
  DAILY_ACTION_CAPS,
  REDEEM_BUNDLES,
  isRedeemBundle,
} from './creditRules'

describe('credit rules', () => {
  it('uses the agreed earn amounts', () => {
    expect(CREDIT_AMOUNTS.give_feedback).toBe(30)
    expect(CREDIT_AMOUNTS.receive_feedback).toBe(20)
    expect(CREDIT_AMOUNTS.accept_plan).toBe(5)
    expect(CREDIT_AMOUNTS.daily_checkin).toBe(10)
    expect(CREDIT_AMOUNTS.confirm_change_receiver).toBe(20)
    expect(CREDIT_AMOUNTS.confirm_change_sender).toBe(10)
  })

  it('caps giving feedback at 5 credited actions per day', () => {
    expect(DAILY_ACTION_CAPS.give_feedback).toBe(5)
  })

  it('recognizes valid redeem bundles and rejects unknown ones', () => {
    expect(isRedeemBundle('ai_calls_10')).toBe(true)
    expect(isRedeemBundle('ai_calls_25')).toBe(true)
    expect(isRedeemBundle('free_money')).toBe(false)
  })

  it('prices redemption bundles as credits → AI calls', () => {
    expect(REDEEM_BUNDLES.ai_calls_10).toEqual({ credits: 50, aiCalls: 10 })
    expect(REDEEM_BUNDLES.ai_calls_25).toEqual({ credits: 100, aiCalls: 25 })
  })
})
