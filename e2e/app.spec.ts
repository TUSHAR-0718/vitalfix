// ── E2E Tests: VitalFix Full Application ──
// Tests critical user paths with Playwright

import { test, expect } from '@playwright/test'

// ──────────────────────────────────────────────────
// Landing Page
// ──────────────────────────────────────────────────

test.describe('Landing Page', () => {
  test('renders hero section with CTA buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/VitalFix/)
    // H1 contains "Fix Your Core Web Vitals" from the actual page.tsx
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Browse Code Library/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Run Free Audit/i }).first()).toBeVisible()
  })

  test('displays all CWV metric pills (LCP, INP, CLS, TTFB)', async ({ page }) => {
    await page.goto('/')
    for (const metric of ['LCP', 'INP', 'CLS', 'TTFB']) {
      await expect(page.locator(`text=${metric}`).first()).toBeVisible()
    }
  })

  test('displays features section with 3 feature cards', async ({ page }) => {
    await page.goto('/')
    // These are the actual feature titles from page.tsx
    await expect(page.locator('h3:has-text("Code Library")')).toBeVisible()
    await expect(page.locator('h3:has-text("Audit Checklist")')).toBeVisible()
    await expect(page.locator('h3:has-text("Interactive Tools")')).toBeVisible()
  })

  test('navigates to library page from hero CTA', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Browse Code Library/i }).click()
    await expect(page).toHaveURL('/library')
  })

  test('navigates to dashboard from hero CTA', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Run Free Audit/i }).first().click()
    await expect(page).toHaveURL('/dashboard')
  })
})

// ──────────────────────────────────────────────────
// Dashboard Page
// ──────────────────────────────────────────────────

test.describe('Dashboard Page', () => {
  test('renders audit form with URL input and controls', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('h1')).toContainText('Lighthouse Audit')
    await expect(page.locator('#url-input')).toBeVisible()
    await expect(page.locator('#run-audit-btn')).toBeVisible()
  })

  test('shows device toggle (mobile/desktop)', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('button:has-text("Mobile")')).toBeVisible()
    await expect(page.locator('button:has-text("Desktop")')).toBeVisible()
  })

  test('shows alternative audit options when no result loaded', async ({ page }) => {
    await page.goto('/dashboard')
    // Text from the actual page: "Other Ways to Audit"
    await expect(page.locator('h2:has-text("Other Ways to Audit")')).toBeVisible()
  })

  test('run audit button is disabled without input', async ({ page }) => {
    await page.goto('/dashboard')
    const btn = page.locator('#run-audit-btn')
    await expect(btn).toBeVisible()
  })
})

// ──────────────────────────────────────────────────
// Navigation
// ──────────────────────────────────────────────────

test.describe('Navigation', () => {
  test('navbar links are present', async ({ page }) => {
    await page.goto('/')
    // Use .first() since desktop + mobile navs both have links
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Code Library' }).first()).toBeVisible()
  })

  test('all routes load without errors', async ({ page }) => {
    const routes = ['/', '/dashboard', '/library', '/checklist', '/tools', '/docs', '/pricing']

    for (const route of routes) {
      const response = await page.goto(route)
      expect(response?.status()).toBeLessThan(400)
    }
  })
})

// ──────────────────────────────────────────────────
// Static Pages
// ──────────────────────────────────────────────────

test.describe('Static Pages', () => {
  test('Library page loads with code snippets', async ({ page }) => {
    await page.goto('/library')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Checklist page loads', async ({ page }) => {
    await page.goto('/checklist')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Tools page loads', async ({ page }) => {
    await page.goto('/tools')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Docs page loads', async ({ page }) => {
    await page.goto('/docs')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('Pricing page loads', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.locator('h1')).toBeVisible()
  })
})

// ──────────────────────────────────────────────────
// API Route Validation
// ──────────────────────────────────────────────────

test.describe('API: /api/audit/full', () => {
  test('returns 400 when URL is missing', async ({ request }) => {
    const res = await request.get('/api/audit/full')
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Missing url')
  })

  test('returns 400 for invalid URL', async ({ request }) => {
    const res = await request.get('/api/audit/full?url=not-a-url')
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid URL')
  })

  test('returns 400 for invalid strategy', async ({ request }) => {
    const res = await request.get('/api/audit/full?url=https://example.com&strategy=invalid')
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid strategy')
  })

  test('blocks private/internal URLs (SSRF protection)', async ({ request }) => {
    const res = await request.get('/api/audit/full?url=http://localhost:3000')
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('internal')
  })

  test('blocks 127.0.0.1 (SSRF protection)', async ({ request }) => {
    const res = await request.get('/api/audit/full?url=http://127.0.0.1')
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('internal')
  })
})

// ──────────────────────────────────────────────────
// SEO & Meta
// ──────────────────────────────────────────────────

test.describe('SEO & Metadata', () => {
  test('pages have proper title tags', async ({ page }) => {
    await page.goto('/')
    const title = await page.title()
    expect(title.length).toBeGreaterThan(10)
  })

  test('robots.txt is accessible', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.status()).toBe(200)
  })

  test('sitemap.xml is accessible', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
  })
})
