'use client'
import { CheckCircle } from 'lucide-react'
import type { AuditResult } from './types'
import { scoreColor, severityColor, categoryIcon, defaultCategoryIcon } from './utils'

export default function SiteAuditTab({ result }: { result: AuditResult }) {
  if (!result.customAudit) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Custom audit data not available</p>
      </div>
    )
  }

  return (
    <div className="stagger">
      {/* Summary bar */}
      <div className="glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Custom Audit Score</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: scoreColor(result.customAudit.overallScore), fontFamily: 'JetBrains Mono, monospace' }}>{result.customAudit.overallScore}</div>
        </div>
        <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{result.customAudit.totalFindings}</span> findings across{' '}
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{result.customAudit.categories.length}</span> categories
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Completed in {(result.customAudit.duration / 1000).toFixed(1)}s
        </div>
      </div>

      {/* Category cards */}
      {result.customAudit.categories.map(cat => {
        const IconComp = categoryIcon[cat.category] || defaultCategoryIcon
        return (
          <div key={cat.category} className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <IconComp size={16} color={scoreColor(cat.score)} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{cat.label}</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 900, marginLeft: 'auto', color: scoreColor(cat.score), fontFamily: 'JetBrains Mono, monospace' }}>{cat.score}</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{cat.passed} passed · {cat.failed} failed</span>
            </div>
            {cat.findings.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {cat.findings.map((f, i) => (
                  <div key={f.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.7rem 1rem', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 4, background: `${severityColor[f.severity]}15`, color: severityColor[f.severity], border: `1px solid ${severityColor[f.severity]}30`, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>{f.severity}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.15rem' }}>{f.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.description}</div>
                      {f.element && <div style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', marginTop: '0.3rem', padding: '0.3rem 0.5rem', borderRadius: 4, background: 'rgba(129,140,248,0.06)', wordBreak: 'break-all' }}>{f.element}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {cat.findings.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: 8, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                <CheckCircle size={14} color="#34d399" />
                <span style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 600 }}>All checks passed</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
