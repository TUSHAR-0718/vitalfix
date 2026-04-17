import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkQuota, incrementAuditCount, PLANS } from '@/lib/plans'
import { supabase } from '@/lib/supabase'

// Mock the getProfile internal function by mocking the supabase module directly
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: () => true
}))

describe('Plans & Quota Logic', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('free user is governed by daily limit of 3', async () => {
    // Mock getProfile to return a free user with 2 out of 3 used
    vi.mocked(supabase!.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-1',
              plan: 'free',
              daily_audit_count: 2,
              daily_audit_reset: new Date().toISOString().slice(0, 10),
            },
            error: null
          })
        })
      })
    } as any)

    const result = await checkQuota('user-1')
    expect(result.allowed).toBe(true)
    expect(result.used).toBe(2)
    expect(result.limit).toBe(3)
    expect(result.remaining).toBe(1)
    expect(result.plan).toBe('free')
  })

  it('free user is blocked after exactly 3 audits', async () => {
    // Mock getProfile to return a free user with 3 out of 3 used
    vi.mocked(supabase!.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-1',
              plan: 'free',
              daily_audit_count: 3,
              daily_audit_reset: new Date().toISOString().slice(0, 10),
            },
            error: null
          })
        })
      })
    } as any)

    const result = await checkQuota('user-1')
    expect(result.allowed).toBe(false)
    expect(result.used).toBe(3)
    expect(result.limit).toBe(3)
    expect(result.remaining).toBe(0)
  })

  it('pro user has unlimited audits', async () => {
    // Mock getProfile to return a pro user
    vi.mocked(supabase!.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'user-1',
              plan: 'pro',
              daily_audit_count: 10,
              daily_audit_reset: new Date().toISOString().slice(0, 10),
            },
            error: null
          })
        })
      })
    } as any)

    const result = await checkQuota('user-1')
    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(-1) // unlimited
    expect(result.plan).toBe('pro')
  })
})
