'use client'

import dynamic from 'next/dynamic'

const SocialProof = dynamic(() => import('./SocialProof'), { ssr: false })

export default function SocialProofWrapper() {
  return <SocialProof />
}
