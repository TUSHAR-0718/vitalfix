// ── Unit Tests: Accessibility Audit ──

import { describe, it, expect } from 'vitest'
import * as cheerio from 'cheerio'
import { checkAccessibility } from '@/lib/audit-engine/accessibility'
import type { FetchResult } from '@/lib/audit-engine/types'

function makeFetched(html: string): FetchResult {
  return { html, headers: {}, statusCode: 200, url: 'https://example.com', timing: 100 }
}

describe('checkAccessibility — lang attribute', () => {
  it('flags missing lang on <html>', async () => {
    const html = `<html><head></head><body></body></html>`
    const result = await checkAccessibility(makeFetched(html), cheerio.load(html))
    const finding = result.findings.find(f => f.id === 'no-html-lang')
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('critical')
  })

  it('passes when lang is set', async () => {
    const html = `<html lang="en"><head></head><body></body></html>`
    const result = await checkAccessibility(makeFetched(html), cheerio.load(html))
    const finding = result.findings.find(f => f.id === 'no-html-lang')
    expect(finding).toBeUndefined()
  })
})

describe('checkAccessibility — form labels', () => {
  it('flags inputs without labels', async () => {
    const html = `<html lang="en"><body><input type="email" id="email"></body></html>`
    const result = await checkAccessibility(makeFetched(html), cheerio.load(html))
    const finding = result.findings.find(f => f.id === 'unlabeled-inputs')
    expect(finding).toBeDefined()
  })

  it('passes with aria-label', async () => {
    const html = `<html lang="en"><body><input type="email" aria-label="Email"></body></html>`
    const result = await checkAccessibility(makeFetched(html), cheerio.load(html))
    const finding = result.findings.find(f => f.id === 'unlabeled-inputs')
    expect(finding).toBeUndefined()
  })

  it('skips hidden/submit/button inputs', async () => {
    const html = `<html lang="en"><body><input type="hidden" value="token"><input type="submit" value="Send"></body></html>`
    const result = await checkAccessibility(makeFetched(html), cheerio.load(html))
    const finding = result.findings.find(f => f.id === 'unlabeled-inputs')
    expect(finding).toBeUndefined()
  })
})

describe('checkAccessibility — ARIA landmarks', () => {
  it('flags missing <main> landmark', async () => {
    const html = `<html lang="en"><body><div>No main here</div></body></html>`
    const result = await checkAccessibility(makeFetched(html), cheerio.load(html))
    const finding = result.findings.find(f => f.id === 'no-main-landmark')
    expect(finding).toBeDefined()
  })

  it('accepts role="main" as alternative', async () => {
    const html = `<html lang="en"><body><div role="main">Content</div></body></html>`
    const result = await checkAccessibility(makeFetched(html), cheerio.load(html))
    const finding = result.findings.find(f => f.id === 'no-main-landmark')
    expect(finding).toBeUndefined()
  })
})

describe('checkAccessibility — empty buttons', () => {
  it('flags buttons without accessible name', async () => {
    const html = `<html lang="en"><body><main><button></button></main></body></html>`
    const result = await checkAccessibility(makeFetched(html), cheerio.load(html))
    const finding = result.findings.find(f => f.id === 'empty-buttons')
    expect(finding).toBeDefined()
  })

  it('passes with button text', async () => {
    const html = `<html lang="en"><body><main><button>Submit</button></main></body></html>`
    const result = await checkAccessibility(makeFetched(html), cheerio.load(html))
    const finding = result.findings.find(f => f.id === 'empty-buttons')
    expect(finding).toBeUndefined()
  })
})

describe('checkAccessibility — tabindex', () => {
  it('flags positive tabindex as anti-pattern', async () => {
    const html = `<html lang="en"><body><main><div tabindex="5">Bad</div></main></body></html>`
    const result = await checkAccessibility(makeFetched(html), cheerio.load(html))
    const finding = result.findings.find(f => f.id === 'positive-tabindex')
    expect(finding).toBeDefined()
  })

  it('accepts tabindex=0 and tabindex=-1', async () => {
    const html = `<html lang="en"><body><main><div tabindex="0">OK</div><div tabindex="-1">OK</div></main></body></html>`
    const result = await checkAccessibility(makeFetched(html), cheerio.load(html))
    const finding = result.findings.find(f => f.id === 'positive-tabindex')
    expect(finding).toBeUndefined()
  })
})
