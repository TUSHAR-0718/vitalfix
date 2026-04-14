// ── Security Audit Module Tests ──
// Tests HTTPS, security headers, and mixed content detection

import { describe, it, expect } from 'vitest'
import * as cheerio from 'cheerio'
import { checkSecurity } from '@/lib/audit-engine/security'
import type { FetchResult } from '@/lib/audit-engine/types'

function makeFetched(overrides: Partial<FetchResult> = {}): FetchResult {
  return {
    html: '<html><body></body></html>',
    headers: {},
    statusCode: 200,
    url: 'https://example.com',
    timing: 100,
    ...overrides,
  }
}

function load(html: string) {
  return cheerio.load(html)
}

// ──────────────────────────────────────────────
describe('checkSecurity — HTTPS check', () => {
  it('passes for HTTPS sites', async () => {
    const fetched = makeFetched({ url: 'https://example.com' })
    const result = await checkSecurity(fetched, load(fetched.html))

    const httpsIssue = result.findings.find(f => f.id === 'no-https')
    expect(httpsIssue).toBeUndefined()
  })

  it('flags HTTP sites as critical', async () => {
    const fetched = makeFetched({ url: 'http://example.com' })
    const result = await checkSecurity(fetched, load(fetched.html))

    const httpsIssue = result.findings.find(f => f.id === 'no-https')
    expect(httpsIssue).toBeDefined()
    expect(httpsIssue!.severity).toBe('critical')
  })
})

// ──────────────────────────────────────────────
describe('checkSecurity — security headers', () => {
  it('flags all missing security headers', async () => {
    const fetched = makeFetched({ headers: {} })
    const result = await checkSecurity(fetched, load(fetched.html))

    const headerFindings = result.findings.filter(f => f.id?.startsWith('missing-header'))
    // Should flag: HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
    expect(headerFindings.length).toBe(6)
  })

  it('passes when all security headers are present', async () => {
    const fetched = makeFetched({
      headers: {
        'strict-transport-security': 'max-age=31536000',
        'content-security-policy': "default-src 'self'",
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=()',
      },
    })
    const result = await checkSecurity(fetched, load(fetched.html))

    const headerFindings = result.findings.filter(f => f.id?.startsWith('missing-header'))
    expect(headerFindings).toHaveLength(0)
  })
})

// ──────────────────────────────────────────────
describe('checkSecurity — mixed content', () => {
  it('detects HTTP resources on HTTPS pages', async () => {
    const html = `
      <html><body>
        <img src="http://cdn.example.com/image.jpg">
        <script src="http://cdn.example.com/script.js"></script>
      </body></html>
    `
    const fetched = makeFetched({ url: 'https://example.com', html })
    const result = await checkSecurity(fetched, load(html))

    const mixed = result.findings.find(f => f.id === 'mixed-content')
    expect(mixed).toBeDefined()
    expect(mixed!.severity).toBe('critical')
    expect(mixed!.value).toBe('2')
  })

  it('passes when all resources use HTTPS', async () => {
    const html = `
      <html><body>
        <img src="https://cdn.example.com/image.jpg">
        <script src="https://cdn.example.com/script.js"></script>
      </body></html>
    `
    const fetched = makeFetched({ url: 'https://example.com', html })
    const result = await checkSecurity(fetched, load(html))

    const mixed = result.findings.find(f => f.id === 'mixed-content')
    expect(mixed).toBeUndefined()
  })
})

// ──────────────────────────────────────────────
describe('checkSecurity — server exposure', () => {
  it('flags server header with version numbers', async () => {
    const fetched = makeFetched({
      headers: { server: 'nginx/1.19.2' },
    })
    const result = await checkSecurity(fetched, load(fetched.html))

    const finding = result.findings.find(f => f.id === 'server-version-exposed')
    expect(finding).toBeDefined()
  })

  it('passes for server header without version', async () => {
    const fetched = makeFetched({
      headers: { server: 'nginx' },
    })
    const result = await checkSecurity(fetched, load(fetched.html))

    const finding = result.findings.find(f => f.id === 'server-version-exposed')
    expect(finding).toBeUndefined()
  })

  it('flags exposed X-Powered-By header', async () => {
    const fetched = makeFetched({
      headers: { 'x-powered-by': 'Express' },
    })
    const result = await checkSecurity(fetched, load(fetched.html))

    const finding = result.findings.find(f => f.id === 'x-powered-by-exposed')
    expect(finding).toBeDefined()
  })
})
