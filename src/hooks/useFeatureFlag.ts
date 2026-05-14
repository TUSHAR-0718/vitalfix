'use client'

// ── Feature Flag Hooks ──
// Convenience hooks for consuming PostHog feature flags in React components.
// Returns safe defaults when PostHog is not configured or flags haven't loaded.

import { useFeatureFlagEnabled, useFeatureFlagVariantKey, useFeatureFlagPayload } from 'posthog-js/react'

/**
 * Check if a boolean feature flag is enabled.
 *
 * @param flagKey - The flag key from PostHog (e.g., 'new-dashboard-layout')
 * @returns true if the flag is enabled, false otherwise (including when loading)
 *
 * @example
 * ```tsx
 * const showNewLayout = useFlag('new-dashboard-layout')
 * return showNewLayout ? <NewLayout /> : <OldLayout />
 * ```
 */
export function useFlag(flagKey: string): boolean {
  const isEnabled = useFeatureFlagEnabled(flagKey)
  // PostHog returns undefined while loading — treat as false
  return isEnabled === true
}

/**
 * Get the variant key for a multivariate feature flag.
 *
 * @param flagKey - The flag key from PostHog
 * @returns The variant key string (e.g., 'control', 'variant-a'), or undefined if not loaded
 *
 * @example
 * ```tsx
 * const variant = useFlagVariant('pricing-page-experiment')
 * if (variant === 'variant-a') return <PricingA />
 * if (variant === 'variant-b') return <PricingB />
 * return <PricingControl />
 * ```
 */
export function useFlagVariant(flagKey: string): string | undefined {
  const variant = useFeatureFlagVariantKey(flagKey)
  // PostHog can return boolean for simple flags — we only want string variants
  if (typeof variant === 'string') return variant
  return undefined
}

/**
 * Get the JSON payload attached to a feature flag.
 * Useful for remote configuration (e.g., passing limits, copy, thresholds).
 *
 * @param flagKey - The flag key from PostHog
 * @returns The payload value, or undefined if not loaded
 *
 * @example
 * ```tsx
 * const config = useFlagPayload('audit-config') as { maxRetries: number } | undefined
 * const retries = config?.maxRetries ?? 3
 * ```
 */
export function useFlagPayload<T = unknown>(flagKey: string): T | undefined {
  const payload = useFeatureFlagPayload(flagKey)
  return (payload as T) ?? undefined
}
