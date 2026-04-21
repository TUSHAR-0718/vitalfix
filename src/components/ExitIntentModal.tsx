'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Mail, ArrowRight, Zap, Loader2, CheckCircle } from 'lucide-react'

export default function ExitIntentModal() {
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showModal = useCallback(() => {
    // Only show once per session
    const shown = sessionStorage.getItem('vitalfix-exit-shown')
    if (shown) return
    setVisible(true)
    sessionStorage.setItem('vitalfix-exit-shown', '1')
  }, [])

  useEffect(() => {
    // Already shown
    if (sessionStorage.getItem('vitalfix-exit-shown')) return

    // Desktop: detect mouse leaving viewport (top edge)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5 && e.relatedTarget === null) {
        showModal()
      }
    }

    // Wait 10s before activating (don't fire on accidental early mouse moves)
    const activateTimer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave)
    }, 10_000)

    return () => {
      clearTimeout(activateTimer)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [showModal])

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
          source: 'exit_intent',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      setSubmitted(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1001,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 200ms ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440,
          background: 'var(--bg-card)',
          border: '1px solid rgba(129,140,248,0.2)',
          borderRadius: 20,
          padding: '2.25rem',
          boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
          animation: 'scaleIn 250ms cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: -80, right: -60, width: 220, height: 220,
          borderRadius: '50%', background: 'rgba(129,140,248,0.06)',
          filter: 'blur(50px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -50, left: -40, width: 160, height: 160,
          borderRadius: '50%', background: 'rgba(52,211,153,0.05)',
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />

        <button
          onClick={handleClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '0.25rem',
          }}
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <CheckCircle size={26} color="#34d399" />
            </div>
            <h3 style={{ fontWeight: 800, fontSize: '1.15rem', marginBottom: '0.5rem' }}>
              You&apos;re on the list! ✅
            </h3>
            <p style={{
              fontSize: '0.85rem', color: 'var(--text-secondary)',
              lineHeight: 1.6, marginBottom: '1.25rem',
            }}>
              Check your inbox for the Core Web Vitals cheat sheet.
            </p>
            <button onClick={handleClose} className="btn-secondary" style={{ fontSize: '0.82rem' }}>
              Continue Browsing
            </button>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <Zap size={22} color="#818cf8" />
              </div>
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                Before you go —
              </h3>
              <h3 style={{
                fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem', lineHeight: 1.3,
                background: 'linear-gradient(135deg, #818cf8, #60a5fa)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Get the CWV Cheat Sheet
              </h3>
              <p style={{
                fontSize: '0.85rem', color: 'var(--text-secondary)',
                lineHeight: 1.6, maxWidth: 340, margin: '0 auto',
              }}>
                The same quick-reference checklist used by performance engineers at top teams. Free, no strings attached.
              </p>
            </div>

            {/* What's inside */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
              marginBottom: '1.5rem',
            }}>
              {[
                'LCP fix recipes',
                'CLS prevention checklist',
                'INP optimization guide',
                'TTFB quick wins',
              ].map(item => (
                <div key={item} style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.4rem 0.6rem', borderRadius: 8,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500,
                }}>
                  <span style={{ color: '#34d399', fontSize: '0.7rem' }}>✓</span>
                  {item}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 0.9rem', borderRadius: 10,
                background: 'var(--bg)', border: '1px solid var(--border)',
              }}>
                <Mail size={14} color="var(--text-muted)" />
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    background: 'transparent', color: 'var(--text-primary)',
                    fontSize: '0.85rem', fontFamily: 'inherit',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="btn-primary"
                style={{
                  padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 700,
                  whiteSpace: 'nowrap', opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <ArrowRight size={14} />}
                {loading ? '' : 'Send'}
              </button>
            </form>

            {error && (
              <p style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '0.5rem', fontWeight: 500, textAlign: 'center' }}>
                {error}
              </p>
            )}

            <p style={{
              fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.75rem',
              textAlign: 'center', opacity: 0.7,
            }}>
              No spam. Unsubscribe anytime.
            </p>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
