'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error Boundary]', error)
  }, [error])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-card" style={{ maxWidth: 520, width: '100%', padding: '2.5rem', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <AlertTriangle size={28} color="#f87171" />
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
          Something Went Wrong
        </h2>

        {/* Error message */}
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: '0.5rem' }}>
          The audit dashboard encountered an unexpected error. This can happen with slow or unreachable sites.
        </p>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          padding: '0.75rem 1rem',
          borderRadius: 8,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          marginBottom: '2rem',
          wordBreak: 'break-word',
          textAlign: 'left',
          maxHeight: 100,
          overflow: 'auto',
        }}>
          {error.message || 'Unknown error'}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={14} />
            Try Again
          </button>
          <Link
            href="/"
            className="btn-secondary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Home size={14} />
            Back to Home
          </Link>
        </div>

        {/* Tip */}
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1.5rem', lineHeight: 1.6 }}>
          Tip: Make sure the URL starts with <code style={{ padding: '0.1rem 0.3rem', borderRadius: 4, background: 'var(--bg)', fontSize: '0.7rem' }}>https://</code> and is publicly accessible.
        </p>
      </div>
    </div>
  )
}
