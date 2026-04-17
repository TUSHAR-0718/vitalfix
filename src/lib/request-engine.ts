/**
 * Audit Request Engine — Production-grade request pipeline
 *
 * Features:
 *  - Adaptive timeout (connection-aware)
 *  - Exponential backoff retries
 *  - Circuit breaker (auto-open on repeated failures, auto-recover)
 *  - Request deduplication (prevents duplicate in-flight requests)
 *  - Stage-based progress tracking
 *  - Structured error classification
 */

import { getConnectionProfile } from '@/lib/audit-context'

// ── Types ──

export type AuditStage =
  | 'connecting'
  | 'fetching'
  | 'analyzing'
  | 'auditing'
  | 'finalizing'
  | 'retrying'
  | 'done'
  | 'error'

export interface AuditStageInfo {
  stage: AuditStage
  label: string
  detail: string
  progress: number // 0-100
}

export type ErrorCategory =
  | 'timeout'
  | 'network'
  | 'server'
  | 'rate_limit'
  | 'invalid_url'
  | 'unknown'

export interface AuditError {
  category: ErrorCategory
  message: string
  hint: string
  retryable: boolean
  retryAfterMs?: number
}

export interface RequestEngineConfig {
  baseTimeout: number
  maxRetries: number
  backoffBaseMs: number
  backoffMaxMs: number
  circuitBreakerThreshold: number
  circuitBreakerCooldownMs: number
}

// ── Stage Definitions ──

const STAGE_TIMELINE: { atSec: number; info: AuditStageInfo }[] = [
  { atSec: 0,  info: { stage: 'connecting',  label: 'Connecting',  detail: 'Reaching PageSpeed Insights API…',  progress: 5 } },
  { atSec: 3,  info: { stage: 'fetching',    label: 'Fetching',    detail: 'Downloading and rendering target page…', progress: 15 } },
  { atSec: 10, info: { stage: 'analyzing',   label: 'Analyzing',   detail: 'Running Lighthouse performance audit…', progress: 35 } },
  { atSec: 25, info: { stage: 'auditing',    label: 'Deep Audit',  detail: 'Running 8-module custom site audit…',  progress: 55 } },
  { atSec: 45, info: { stage: 'auditing',    label: 'Deep Audit',  detail: 'Checking security, images, links…',   progress: 70 } },
  { atSec: 60, info: { stage: 'finalizing',  label: 'Finalizing',  detail: 'Compiling scores and recommendations…',progress: 85 } },
  { atSec: 90, info: { stage: 'finalizing',  label: 'Finalizing',  detail: 'Almost done — complex page detected…', progress: 92 } },
]

export function getStageForElapsed(elapsed: number): AuditStageInfo {
  let current = STAGE_TIMELINE[0].info
  for (const s of STAGE_TIMELINE) {
    if (elapsed >= s.atSec) current = s.info
  }
  return current
}

// ── Circuit Breaker ──

interface CircuitBreakerState {
  failures: number
  lastFailure: number
  isOpen: boolean
  openedAt: number
}

const circuitBreakers = new Map<string, CircuitBreakerState>()

function getCircuitKey(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname
  } catch {
    return url
  }
}

function checkCircuitBreaker(
  url: string,
  threshold: number,
  cooldownMs: number
): { allowed: boolean; retryAfterMs?: number } {
  const key = getCircuitKey(url)
  const state = circuitBreakers.get(key)

  if (!state) return { allowed: true }

  if (state.isOpen) {
    const elapsed = Date.now() - state.openedAt
    if (elapsed >= cooldownMs) {
      // Half-open: allow one attempt
      state.isOpen = false
      state.failures = Math.max(0, state.failures - 1)
      return { allowed: true }
    }
    return { allowed: false, retryAfterMs: cooldownMs - elapsed }
  }

  return { allowed: true }
}

function recordSuccess(url: string) {
  const key = getCircuitKey(url)
  circuitBreakers.delete(key)
}

function recordFailure(url: string, threshold: number) {
  const key = getCircuitKey(url)
  const state = circuitBreakers.get(key) || { failures: 0, lastFailure: 0, isOpen: false, openedAt: 0 }
  state.failures++
  state.lastFailure = Date.now()

  if (state.failures >= threshold) {
    state.isOpen = true
    state.openedAt = Date.now()
  }

  circuitBreakers.set(key, state)
}

// ── Request Deduplication ──

const inflightRequests = new Map<string, Promise<any>>()

function dedupeKey(url: string, device: string, connection: string, location: string): string {
  return `${url}|${device}|${connection}|${location}`
}

// ── Error Classification ──

export function classifyError(error: any): AuditError {
  const msg = error?.message || String(error)

  if (error?.name === 'AbortError' || msg.includes('timed out') || msg.includes('timeout') || msg.includes('AbortError')) {
    return {
      category: 'timeout',
      message: 'The audit timed out',
      hint: 'Google\'s PageSpeed API is slow or congested. Try switching between Mobile ↔ Desktop, or try again in a moment.',
      retryable: true,
    }
  }

  if (msg.includes('NETWORK_ERROR') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_')) {
    return {
      category: 'network',
      message: 'Could not connect to the audit server',
      hint: 'Check your internet connection and try again. If the problem persists, the server may be temporarily down.',
      retryable: true,
    }
  }

  if (msg.includes('Rate limit') || msg.includes('429') || msg.includes('quota')) {
    return {
      category: 'rate_limit',
      message: 'Too many requests',
      hint: 'You\'ve hit the rate limit. Please wait a minute before trying again.',
      retryable: true,
      retryAfterMs: 60_000,
    }
  }

  if (msg.includes('Invalid URL') || msg.includes('valid URL') || msg.includes('SSRF') || msg.includes('blocked')) {
    return {
      category: 'invalid_url',
      message: 'Invalid or blocked URL',
      hint: 'Make sure the URL is publicly accessible and starts with http:// or https://',
      retryable: false,
    }
  }

  if (msg.includes('502') || msg.includes('503') || msg.includes('504') || msg.includes('Both audit engines failed')) {
    return {
      category: 'server',
      message: msg,
      hint: 'The target site may be unreachable, too complex, or blocking automated requests. Try a different URL or try again later.',
      retryable: true,
    }
  }

  return {
    category: 'unknown',
    message: msg || 'Something went wrong',
    hint: 'Check the URL and try again. If the issue persists, try a different URL.',
    retryable: false,
  }
}

// ── Exponential Backoff ──

function calculateBackoff(attempt: number, baseMs: number, maxMs: number): number {
  // Exponential backoff with jitter: base * 2^attempt + random jitter
  const exponential = baseMs * Math.pow(2, attempt)
  const jitter = Math.random() * baseMs * 0.5
  return Math.min(exponential + jitter, maxMs)
}

// ── Main Request Engine ──

const DEFAULT_CONFIG: RequestEngineConfig = {
  baseTimeout: 160_000,
  maxRetries: 2,
  backoffBaseMs: 2_000,
  backoffMaxMs: 10_000,
  circuitBreakerThreshold: 3,
  circuitBreakerCooldownMs: 120_000, // 2 min cooldown
}

export interface AuditRequestParams {
  url: string
  device: 'mobile' | 'desktop'
  connection: string
  location: string
}

export interface AuditRequestCallbacks {
  onStageChange: (stage: AuditStageInfo) => void
  onRetry: (attempt: number, maxRetries: number, waitMs: number) => void
}

export async function executeAuditRequest(
  params: AuditRequestParams,
  callbacks: AuditRequestCallbacks,
  abortSignal: AbortSignal,
  config: Partial<RequestEngineConfig> = {},
): Promise<any> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const { url, device, connection, location } = params
  const key = dedupeKey(url, device, connection, location)

  // ── Check circuit breaker ──
  const cbCheck = checkCircuitBreaker(url, cfg.circuitBreakerThreshold, cfg.circuitBreakerCooldownMs)
  if (!cbCheck.allowed) {
    throw Object.assign(
      new Error(`This site has failed multiple times recently. Automatic cooldown active — try again in ${Math.ceil((cbCheck.retryAfterMs || 0) / 1000)}s.`),
      { category: 'rate_limit' as ErrorCategory }
    )
  }

  // ── Deduplicate: if same request is in-flight, return that promise ──
  const inflight = inflightRequests.get(key)
  if (inflight) {
    return inflight
  }

  // ── Connection-aware timeout ──
  const connProfile = getConnectionProfile(connection)
  const adjustedTimeout = Math.round(cfg.baseTimeout * connProfile.timeoutMultiplier)

  const requestPromise = (async () => {
    let lastError: AuditError | null = null

    for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
      if (abortSignal.aborted) throw new DOMException('Aborted', 'AbortError')

      // Set up per-attempt timeout
      const attemptController = new AbortController()
      const timeoutId = setTimeout(() => attemptController.abort(), adjustedTimeout)

      // Combine with external abort signal
      const handleExternalAbort = () => attemptController.abort()
      abortSignal.addEventListener('abort', handleExternalAbort, { once: true })

      try {
        // Update stage
        callbacks.onStageChange({
          stage: attempt > 0 ? 'retrying' : 'connecting',
          label: attempt > 0 ? `Retry ${attempt}/${cfg.maxRetries}` : 'Connecting',
          detail: attempt > 0
            ? `Retrying with exponential backoff (attempt ${attempt + 1})…`
            : 'Reaching PageSpeed Insights API…',
          progress: attempt > 0 ? 5 : 5,
        })

        const res = await fetch(
          `/api/audit/full?url=${encodeURIComponent(url)}&strategy=${device}&connection=${encodeURIComponent(connection)}&location=${encodeURIComponent(location)}`,
          { signal: attemptController.signal }
        )

        clearTimeout(timeoutId)
        abortSignal.removeEventListener('abort', handleExternalAbort)

        // Parse response
        let data: any
        try {
          data = await res.json()
        } catch {
          throw new Error(`Server returned an invalid response (HTTP ${res.status}). The audit server may have crashed.`)
        }

        if (!res.ok) {
          const msg = data.error || `Audit failed (HTTP ${res.status})`
          const hint = data.hint ? ` ${data.hint}` : ''
          throw new Error(msg + hint)
        }

        // ── Success ──
        recordSuccess(url)
        callbacks.onStageChange({ stage: 'done', label: 'Complete', detail: 'Audit finished successfully.', progress: 100 })
        return data

      } catch (err: any) {
        clearTimeout(timeoutId)
        abortSignal.removeEventListener('abort', handleExternalAbort)

        // External abort (user cancelled) — don't retry
        if (abortSignal.aborted) throw new DOMException('Aborted', 'AbortError')

        lastError = classifyError(err)

        // Only retry on retryable errors
        if (lastError.retryable && attempt < cfg.maxRetries) {
          const waitMs = calculateBackoff(attempt, cfg.backoffBaseMs, cfg.backoffMaxMs)
          callbacks.onRetry(attempt + 1, cfg.maxRetries, waitMs)

          // Wait with abort awareness
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, waitMs)
            const abortWait = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) }
            abortSignal.addEventListener('abort', abortWait, { once: true })
          })

          continue
        }

        break
      }
    }

    // ── All attempts failed ──
    recordFailure(url, cfg.circuitBreakerThreshold)
    throw lastError || classifyError(new Error('All retry attempts exhausted'))
  })()

  // Track in-flight
  inflightRequests.set(key, requestPromise)
  try {
    return await requestPromise
  } finally {
    inflightRequests.delete(key)
  }
}

// ── Debounce Utility ──

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number,
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null

  const debounced = ((...args: any[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, delayMs)
  }) as T & { cancel: () => void }

  debounced.cancel = () => {
    if (timer) { clearTimeout(timer); timer = null }
  }

  return debounced
}
