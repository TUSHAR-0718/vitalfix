// ── Unit Tests: Fetcher Utilities ──
// Tests resolveUrl (no network calls)

import { describe, it, expect } from 'vitest'
import { resolveUrl } from '@/lib/audit-engine/fetcher'

describe('resolveUrl', () => {
  it('resolves absolute URL as-is', () => {
    expect(resolveUrl('https://cdn.example.com/img.png', 'https://example.com'))
      .toBe('https://cdn.example.com/img.png')
  })

  it('resolves relative URL against base', () => {
    expect(resolveUrl('/images/hero.jpg', 'https://example.com/page'))
      .toBe('https://example.com/images/hero.jpg')
  })

  it('resolves protocol-relative URL', () => {
    expect(resolveUrl('//cdn.example.com/style.css', 'https://example.com'))
      .toBe('https://cdn.example.com/style.css')
  })

  it('resolves relative path with dot segments', () => {
    expect(resolveUrl('../assets/logo.svg', 'https://example.com/pages/about'))
      .toBe('https://example.com/assets/logo.svg')
  })

  it('returns null for invalid URLs', () => {
    expect(resolveUrl(':::invalid', 'also-invalid')).toBeNull()
  })

  it('handles empty href gracefully', () => {
    expect(resolveUrl('', 'https://example.com')).toBe('https://example.com/')
  })
})
