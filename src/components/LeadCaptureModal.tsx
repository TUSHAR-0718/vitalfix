'use client'

import { useState, useEffect } from 'react'
import { X, Mail, ArrowRight, Sparkles, BarChart3, Shield, Loader2, CheckCircle } from 'lucide-react'

interface LeadCaptureModalProps {
  url: string
  healthScore?: number
  onClose: () => void
  onSignUp: () => void // opens AuthModal
}

export default function LeadCaptureModal({ url, healthScore, onClose, onSignUp }: LeadCaptureModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  // Check if already shown this session
  useEffect(() => {
    const shown = sessionStorage.getItem('vitalfix-lead-shown')
    if (shown) {
      onClose()
      return
    }
    // Delay appearance for 1.5s after component mounts (feels more natural)
    const timer = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          source: 'audit_modal',
          url_audited: url,
          metadata: { healthScore },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      setSubmitted(true)
      sessionStorage.setItem('vitalfix-lead-shown', '1')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    sessionStorage.setItem('vitalfix-lead-shown', '1')
    onClose()
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
        display: 'flex', justifyContent: 'center', padding: '1rem',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--bg-card)',
          border: '1px solid rgba(129,140,248,0.25)',
          borderRadius: 20,
          padding: '1.75rem',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.25), 0 0 80px rgba(129,140,248,0.08)',
          animation: 'slideUpFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'all',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow effect */}
        <div style={{
          position: 'absolute', top: -60, right: -40, width: 180, height: 180,
          borderRadius: '50%', background: 'rgba(129,140,248,0.06)',
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />

        {/* Close button */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '0.25rem',
          }}
        >
          <X size={16} />
        </button>

        {submitted ? (
          // ── Success state ──
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <CheckCircle size={24} color="#34d399" />
            </div>
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              You&apos;re in! 🎉
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              We&apos;ll send you weekly Web Vitals insights and tips.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                onClick={() => { onSignUp(); handleDismiss() }}
                className="btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.6rem 1.25rem' }}
              >
                Create Account to Save Results <ArrowRight size={14} />
              </button>
              <button
                onClick={handleDismiss}
                className="btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.6rem 1rem' }}
              >
                Maybe Later
              </button>
            </div>
          </div>
        ) : (
          // ── Capture state ──
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={16} color="#818cf8" />
              </div>
              <h3 style={{ fontWeight: 800, fontSize: '1rem', margin: 0 }}>
                Save Your Audit Results
              </h3>
            </div>

            <p style={{
              fontSize: '0.82rem', color: 'var(--text-secondary)',
              lineHeight: 1.6, marginBottom: '1rem',
            }}>
              Get weekly performance digests, track your score over time, and never lose an audit report.
            </p>

            {/* Value props */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {[
                { icon: <BarChart3 size={12} />, text: 'Track trends', color: '#60a5fa' },
                { icon: <Mail size={12} />, text: 'Weekly digest', color: '#34d399' },
                { icon: <Shield size={12} />, text: 'Regression alerts', color: '#fbbf24' },
              ].map(v => (
                <div key={v.text} style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500,
                }}>
                  <span style={{ color: v.color }}>{v.icon}</span> {v.text}
                </div>
              ))}
            </div>

            {/* Email form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.55rem 0.85rem', borderRadius: 10,
                background: 'var(--bg)', border: '1px solid var(--border)',
              }}>
                <Mail size={14} color="var(--text-muted)" />
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    background: 'transparent', color: 'var(--text-primary)',
                    fontSize: '0.82rem', fontFamily: 'inherit',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-primary"
                style={{
                  padding: '0.55rem 1.1rem', fontSize: '0.82rem', fontWeight: 700,
                  whiteSpace: 'nowrap', opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <ArrowRight size={14} />}
                {loading ? '' : 'Save'}
              </button>
            </form>

            {error && (
              <p style={{
                fontSize: '0.72rem', color: '#f87171', marginTop: '0.5rem', fontWeight: 500,
              }}>
                {error}
              </p>
            )}

            <p style={{
              fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.75rem',
              textAlign: 'center', opacity: 0.7,
            }}>
              No spam, ever. Unsubscribe with one click.
            </p>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
