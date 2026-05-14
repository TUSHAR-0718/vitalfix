'use client'

import dynamic from 'next/dynamic'
import { useFlag } from '@/hooks/useFeatureFlag'

const SocialProof = dynamic(() => import('./SocialProof'), { ssr: false })

export default function SocialProofWrapper() {
  // Kill switch: disable social proof toasts from PostHog dashboard
  // Flag: "social-proof-enabled" — default: true
  const isEnabled = useFlag('social-proof-enabled')

  const posthogConfigured = !!process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (posthogConfigured && !isEnabled) return null

  return <SocialProof />
}
