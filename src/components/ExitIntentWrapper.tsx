'use client'

import dynamic from 'next/dynamic'
import { useFlag } from '@/hooks/useFeatureFlag'

const ExitIntentModal = dynamic(() => import('./ExitIntentModal'), { ssr: false })

export default function ExitIntentWrapper() {
  // Kill switch: disable exit intent modal from PostHog dashboard
  // Flag: "exit-intent-enabled" — default: true (enabled when PostHog is not configured)
  const isEnabled = useFlag('exit-intent-enabled')

  // If PostHog is configured and flag is disabled, don't render
  // Note: useFlag returns false while loading/unconfigured — we want to show by default
  // so we check if PostHog is configured. If it's not, always render.
  const posthogConfigured = !!process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (posthogConfigured && !isEnabled) return null

  return <ExitIntentModal />
}
