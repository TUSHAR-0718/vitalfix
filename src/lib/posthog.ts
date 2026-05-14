// ── PostHog Server Client ──
// Singleton PostHog Node client for server-side feature flag evaluation.
// Used in API routes and Server Components. Gracefully degrades when unconfigured.

import { PostHog } from 'posthog-node'

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

let _serverClient: PostHog | null = null

/**
 * Returns a singleton PostHog Node client for server-side usage.
 * Returns null if PostHog is not configured (missing API key).
 */
export function getPostHogServer(): PostHog | null {
  if (!posthogKey) {
    return null
  }

  if (!_serverClient) {
    _serverClient = new PostHog(posthogKey, {
      host: posthogHost,
      // Flush events immediately in serverless environments
      flushAt: 1,
      flushInterval: 0,
    })
  }

  return _serverClient
}

/**
 * Evaluate a feature flag server-side.
 * Returns the flag value, or `defaultValue` if PostHog is unavailable.
 *
 * Uses the modern `evaluateFlags` API (single /flags request, no deprecation warnings).
 *
 * @param flagKey - The feature flag key from PostHog
 * @param distinctId - The user's distinct ID (Supabase user.id or anonymous ID)
 * @param defaultValue - Fallback value when PostHog is unconfigured or flag is missing
 * @param personProperties - Optional properties for targeting rules
 */
export async function getFeatureFlag(
  flagKey: string,
  distinctId: string,
  defaultValue: boolean | string = false,
  personProperties?: Record<string, string>
): Promise<boolean | string> {
  const client = getPostHogServer()
  if (!client) return defaultValue

  try {
    const flags = await client.evaluateFlags(distinctId, {
      flagKeys: [flagKey],
      personProperties,
    })

    const value = flags.getFlag(flagKey)

    // PostHog returns undefined if flag doesn't exist — fall back to default
    return value ?? defaultValue
  } catch (error) {
    console.warn(`[PostHog] Failed to evaluate flag "${flagKey}":`, error)
    return defaultValue
  }
}

/**
 * Evaluate a feature flag and return the JSON payload attached to it.
 * Useful for remote config (e.g., passing limits, copy, or config from PostHog).
 */
export async function getFeatureFlagPayload(
  flagKey: string,
  distinctId: string,
  defaultValue: unknown = null
): Promise<unknown> {
  const client = getPostHogServer()
  if (!client) return defaultValue

  try {
    const flags = await client.evaluateFlags(distinctId, {
      flagKeys: [flagKey],
    })
    const payload = flags.getFlagPayload(flagKey)
    return payload ?? defaultValue
  } catch (error) {
    console.warn(`[PostHog] Failed to get payload for "${flagKey}":`, error)
    return defaultValue
  }
}

/**
 * Track a server-side event in PostHog.
 * Use this in API routes where client-side tracking isn't possible.
 */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  const client = getPostHogServer()
  if (!client) return

  client.capture({
    distinctId,
    event,
    properties,
  })
}

export function isPostHogConfigured(): boolean {
  return !!posthogKey
}
