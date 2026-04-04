'use client'
import { useState } from 'react'
import { CheckCircle, ChevronDown, ChevronRight, Copy, ExternalLink, TrendingUp } from 'lucide-react'
import type { AuditResult } from './types'
import { scoreColor, severityColor, categoryIcon, defaultCategoryIcon } from './utils'

export default function SiteAuditTab({ result }: { result: AuditResult }) {
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (!result.customAudit) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Custom audit data not available</p>
      </div>
    )
  }

  const toggleFinding = (id: string) => {
    setExpandedFindings(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const copySnippet = (id: string, code: string) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Count findings with recommendations
  const totalRecs = result.customAudit.categories.reduce(
    (sum, cat) => sum + cat.findings.filter(f => f.recommendation).length, 0
  )

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
        {totalRecs > 0 && (
          <>
            <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
              <TrendingUp size={13} />
              {totalRecs} fix{totalRecs !== 1 ? 'es' : ''} available
            </div>
          </>
        )}
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
                {cat.findings.map((f, i) => {
                  const isExpanded = expandedFindings.has(f.id || `${cat.category}-${i}`)
                  const findingKey = f.id || `${cat.category}-${i}`
                  const hasRec = !!f.recommendation

                  return (
                    <div key={findingKey} style={{ borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                      {/* Finding header */}
                      <div
                        onClick={() => hasRec && toggleFinding(findingKey)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                          padding: '0.7rem 1rem',
                          cursor: hasRec ? 'pointer' : 'default',
                          transition: 'background 150ms',
                        }}
                      >
                        {/* Expand chevron */}
                        {hasRec ? (
                          <span style={{ marginTop: 3, flexShrink: 0, color: 'var(--text-muted)', transition: 'transform 150ms' }}>
                            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </span>
                        ) : (
                          <span style={{ width: 13, flexShrink: 0 }} />
                        )}

                        {/* Severity badge */}
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 4,
                          background: `${severityColor[f.severity]}15`, color: severityColor[f.severity],
                          border: `1px solid ${severityColor[f.severity]}30`,
                          textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2,
                        }}>{f.severity}</span>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.15rem' }}>{f.title}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.description}</div>
                          {f.element && <div style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)', marginTop: '0.3rem', padding: '0.3rem 0.5rem', borderRadius: 4, background: 'rgba(129,140,248,0.06)', wordBreak: 'break-all' }}>{f.element}</div>}
                        </div>

                        {/* Uplift badge */}
                        {f.estimatedUplift != null && f.estimatedUplift > 0 && (
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: '0.2rem',
                            fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 4,
                            background: 'rgba(52,211,153,0.1)', color: '#34d399',
                            border: '1px solid rgba(52,211,153,0.2)',
                            whiteSpace: 'nowrap', flexShrink: 0,
                          }}>
                            <TrendingUp size={10} />
                            +{f.estimatedUplift}
                          </span>
                        )}
                      </div>

                      {/* Expanded recommendation panel */}
                      {hasRec && isExpanded && f.recommendation && (
                        <div style={{
                          padding: '0.85rem 1rem 1rem 2.6rem',
                          borderTop: '1px solid var(--border)',
                          background: 'rgba(52,211,153,0.02)',
                          animation: 'fadeIn 200ms ease-out',
                        }}>
                          {/* Fix instruction */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <span style={{
                              fontSize: '0.62rem', fontWeight: 700, padding: '0.12rem 0.4rem', borderRadius: 3,
                              background: f.recommendation.estimatedImpact === 'high' ? 'rgba(248,113,113,0.1)' : f.recommendation.estimatedImpact === 'medium' ? 'rgba(251,191,36,0.1)' : 'rgba(96,165,250,0.1)',
                              color: f.recommendation.estimatedImpact === 'high' ? '#f87171' : f.recommendation.estimatedImpact === 'medium' ? '#fbbf24' : '#60a5fa',
                              border: `1px solid ${f.recommendation.estimatedImpact === 'high' ? 'rgba(248,113,113,0.2)' : f.recommendation.estimatedImpact === 'medium' ? 'rgba(251,191,36,0.2)' : 'rgba(96,165,250,0.2)'}`,
                              textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0, marginTop: 2,
                            }}>{f.recommendation.estimatedImpact}</span>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                              {f.recommendation.fix}
                            </p>
                          </div>

                          {/* Code snippet */}
                          {f.recommendation.codeSnippet && (
                            <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
                              <pre style={{
                                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem',
                                padding: '0.75rem 1rem', borderRadius: 6,
                                background: '#0d0d14', color: '#c9d1d9',
                                lineHeight: 1.6, overflow: 'auto', maxHeight: 200,
                                border: '1px solid rgba(255,255,255,0.06)',
                                margin: 0,
                              }}>
                                {f.recommendation.codeSnippet}
                              </pre>
                              <button
                                onClick={(e) => { e.stopPropagation(); copySnippet(findingKey, f.recommendation!.codeSnippet!) }}
                                style={{
                                  position: 'absolute', top: 6, right: 6,
                                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                                  padding: '0.2rem 0.5rem', borderRadius: 4,
                                  background: copiedId === findingKey ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)',
                                  color: copiedId === findingKey ? '#34d399' : '#94a3b8',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer',
                                  transition: 'all 150ms',
                                }}
                              >
                                <Copy size={10} />
                                {copiedId === findingKey ? 'Copied!' : 'Copy'}
                              </button>
                            </div>
                          )}

                          {/* Docs link */}
                          {f.recommendation.docsUrl && (
                            <a
                              href={f.recommendation.docsUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              Learn more <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
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
