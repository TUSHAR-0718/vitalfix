import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Learning Hub — VitalFix',
  description: 'Deep-dive guides on LCP, INP, and CLS. Learn the causes, fixes, and before/after optimizations for every Core Web Vital.',
  openGraph: {
    title: 'VitalFix Learning Hub — Core Web Vitals Deep Dive',
    description: 'Understand what each metric measures, common causes, and how to fix them with production-ready code.',
  },
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
