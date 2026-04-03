'use client'
import { Zap, CheckCircle } from 'lucide-react'
import type { AuditResult } from './types'
import { impactColor } from './utils'

export default function OpportunitiesTab({ result }: { result: AuditResult }) {
  return (
    <div className="glass-card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <Zap size={18} color="#fbbf24" />
        <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>Top Opportunities</h2>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>sorted by impact</span>
      </div>
      {result.opportunities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#34d399' }}>
          <CheckCircle size={32} style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ fontWeight: 700 }}>No major opportunities found!</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>This page is well-optimized.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {result.opportunities.map(op => (
            <div key={op.id} style={{ padding: '1rem 1.25rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: impactColor[op.impact], flexShrink: 0, marginTop: 5, boxShadow: `0 0 6px ${impactColor[op.impact]}` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{op.title}</span>
                    {op.displayValue && (
                      <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#fbbf24', padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                        {op.displayValue}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{op.description?.slice(0, 160)}{op.description?.length > 160 ? '…' : ''}</p>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 5, background: `${impactColor[op.impact]}18`, color: impactColor[op.impact], flexShrink: 0 }}>
                  {op.impact}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
