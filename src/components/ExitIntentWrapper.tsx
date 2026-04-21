'use client'

import dynamic from 'next/dynamic'

const ExitIntentModal = dynamic(() => import('./ExitIntentModal'), { ssr: false })

export default function ExitIntentWrapper() {
  return <ExitIntentModal />
}
