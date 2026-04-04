'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Clock, Trash2, Download, ChevronDown, ChevronRight,
  Smartphone, Monitor, AlertTriangle, BarChart3, GitCompare,
  X, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react'
import ScoreRing from '@/components/ScoreRing'
import Sparkline from '@/components/Sparkline'
import {
  getHistory, getUrlHistory, deleteScan, clearHistory,
  exportHistoryAsJson, relativeTime, groupByDate,
  type StoredScan,
} from '@/lib/scan-history'
import { scoreColor } from './utils'

interface HistoryTabProps {
  currentUrl?: string
  onLoadScan?: (scan: StoredScan) => void
}

export default function HistoryTab({ currentUrl, onLoadScan }: HistoryTabProps) {
  const [scans, setScans] = useState<StoredScan[]>([])
  const [compareA, setCompareA] = useState<StoredScan | null>(null)
  const [compareB, setCompareB] = useState<StoredScan | null>(null)
  const [showCompare, setShowCompare] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  // Load history on mount
  useEffect(() => {
    setScans(getHistory())
  }, [])

  // Auto-expand first group
  useEffect(() => {
    const groups = groupByDate(scans)
    if (groups.length > 0 && !expandedGroup) {
      setExpandedGroup(groups[0].label)
    }
  }, [scans, expandedGroup])

  // Trend data for current URL
  const trendData = useMemo(() => {
    if (!currentUrl) return null
    const urlScans = getUrlHistory(currentUrl)
    if (urlScans.length < 2) return null
    return {
      scores: urlScans.map(s => s.healthScore),
      labels: urlScans.map(s => {
        const d = new Date(s.fetchedAt)
        return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
      }),
      latest: urlScans[urlScans.length - 1],
      previous: urlScans[urlScans.length - 2],
    }
  }, [currentUrl, scans])

  const groups = useMemo(() => groupByDate(scans), [scans])

  const handleDelete = (id: string) => {
    deleteScan(id)
    setScans(getHistory())
    if (compareA?.id === id) setCompareA(null)
    if (compareB?.id === id) setCompareB(null)
  }

  const handleClear = () => {
    if (!confirmClear) { setConfirmClear(true); return }
    clearHistory()
    setScans([])
    setCompareA(null)
    setCompareB(null)
    setConfirmClear(false)
  }

  const handleExport = () => {
    const blobUrl = exportHistoryAsJson()
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `vitalfix-history-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(blobUrl)
  }

  const toggleCompare = (scan: StoredScan) => {
    if (compareA?.id === scan.id) { setCompareA(null); return }
    if (compareB?.id === scan.id) { setCompareB(null); return }
    if (!compareA) { setCompareA(scan); return }
    if (!compareB) { setCompareB(scan); setShowCompare(true); return }
    // Both filled — replace B
    setCompareB(scan)
  }

  // ── Empty state ──
  if (scans.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '1rem' }}>
          <Clock size={40} color="var(--text-muted)" style={{ opacity: 0.4 }} />
        </div>
        <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No scan history yet</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
          Run your first audit to start tracking improvements over time. Each scan is saved automatically.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* ── Trend Chart (for current URL) ── */}
      {trendData && (
        <div className="glass-card" style={{
          padding: '1.5rem',
          marginBottom: '1.25rem',
          background: 'linear-gradient(135deg, rgba(129,140,248,0.04), rgba(52,211,153,0.04))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BarChart3 size={15} color="#818cf8" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Health Score Trend</span>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4, background: 'rgba(129,140,248,0.08)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.15)' }}>
              {trendData.scores.length} scans
            </span>
            {/* Trend delta */}
            {(() => {
              const diff = trendData.latest.healthScore - trendData.previous.healthScore
              if (diff === 0) return null
              const isUp = diff > 0
              return (
                <span style={{
                  marginLeft: 'auto',
                  display: 'flex', alignItems: 'center', gap: '0.2rem',
                  fontSize: '0.75rem', fontWeight: 700,
                  color: isUp ? '#34d399' : '#f87171',
                }}>
                  {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {isUp ? '+' : ''}{diff} pts
                </span>
              )
            })()}
          </div>

          <Sparkline
            data={trendData.scores}
            labels={trendData.labels}
            width={Math.min(600, typeof window !== 'undefined' ? window.innerWidth - 120 : 600)}
            height={72}
            color={scoreColor(trendData.latest.healthScore)}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            <span>{trendData.labels[0]}</span>
            <span>{trendData.labels[trendData.labels.length - 1]}</span>
          </div>
        </div>
      )}

      {/* ── Actions bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        marginBottom: '1.25rem', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {scans.length} scan{scans.length !== 1 ? 's' : ''} saved
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
          {(compareA || compareB) && (
            <button
              onClick={() => { setCompareA(null); setCompareB(null); setShowCompare(false) }}
              className="btn-ghost"
              style={{ fontSize: '0.72rem', color: '#f87171' }}
            >
              <X size={12} /> Clear Compare
            </button>
          )}
          <button onClick={() => { setShowCompare(!showCompare); if (!showCompare && compareA && compareB) setShowCompare(true) }} className="btn-ghost" style={{ fontSize: '0.72rem' }} disabled={!compareA && !compareB}>
            <GitCompare size={12} /> Compare {compareA && compareB ? '✓' : `(${[compareA, compareB].filter(Boolean).length}/2)`}
          </button>
          <button onClick={handleExport} className="btn-ghost" style={{ fontSize: '0.72rem' }}>
            <Download size={12} /> Export
          </button>
          <button onClick={handleClear} className="btn-ghost" style={{ fontSize: '0.72rem', color: confirmClear ? '#f87171' : undefined }}>
            <Trash2 size={12} /> {confirmClear ? 'Confirm Clear?' : 'Clear All'}
          </button>
        </div>
      </div>

      {/* ── Comparison Panel ── */}
      {showCompare && compareA && compareB && (
        <ComparePanel a={compareA} b={compareB} onClose={() => setShowCompare(false)} />
      )}

      {/* ── Timeline ── */}
      {groups.map(group => {
        const isExpanded = expandedGroup === group.label
        return (
          <div key={group.label} style={{ marginBottom: '0.75rem' }}>
            {/* Group header */}
            <button
              onClick={() => setExpandedGroup(isExpanded ? null : group.label)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                width: '100%', padding: '0.5rem 0', background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
              }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>{group.label}</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                ({group.scans.length})
              </span>
            </button>

            {/* Scan cards */}
            {isExpanded && (
              <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.75rem', borderLeft: '2px solid var(--border)' }}>
                {group.scans.map(scan => (
                  <ScanCard
                    key={scan.id}
                    scan={scan}
                    isCompareSelected={compareA?.id === scan.id || compareB?.id === scan.id}
                    onLoad={() => onLoadScan?.(scan)}
                    onDelete={() => handleDelete(scan.id)}
                    onCompare={() => toggleCompare(scan)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Individual Scan Card ──
function ScanCard({ scan, isCompareSelected, onLoad, onDelete, onCompare }: {
  scan: StoredScan
  isCompareSelected: boolean
  onLoad: () => void
  onDelete: () => void
  onCompare: () => void
}) {
  return (
    <div
      className="glass-card"
      style={{
        padding: '1rem 1.25rem',
        borderColor: isCompareSelected ? 'rgba(129,140,248,0.4)' : undefined,
        background: isCompareSelected ? 'rgba(129,140,248,0.04)' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {/* Health Score Ring */}
        <ScoreRing score={scan.healthScore} size={44} strokeWidth={4} color={scoreColor(scan.healthScore)} />

        {/* URL + meta */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
            <span style={{
              fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)',
              fontFamily: "'JetBrains Mono', monospace",
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280,
            }}>
              {scan.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.15rem',
              fontSize: '0.62rem', fontWeight: 600, padding: '0.1rem 0.35rem',
              borderRadius: 4, background: 'rgba(96,165,250,0.08)', color: '#60a5fa',
              border: '1px solid rgba(96,165,250,0.15)',
            }}>
              {scan.strategy === 'mobile' ? <Smartphone size={9} /> : <Monitor size={9} />}
              {scan.strategy}
            </span>
            {scan.partial && (
              <span style={{
                fontSize: '0.6rem', fontWeight: 600, padding: '0.1rem 0.35rem',
                borderRadius: 4, background: 'rgba(251,191,36,0.08)', color: '#fbbf24',
                border: '1px solid rgba(251,191,36,0.15)',
              }}>
                Partial
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{relativeTime(scan.fetchedAt)}</span>
            {scan.scores && (
              <>
                <span>·</span>
                <span>P:<strong style={{ color: scoreColor(scan.scores.performance) }}>{scan.scores.performance}</strong></span>
                <span>A:<strong style={{ color: scoreColor(scan.scores.accessibility) }}>{scan.scores.accessibility}</strong></span>
                <span>BP:<strong style={{ color: scoreColor(scan.scores.bestPractices) }}>{scan.scores.bestPractices}</strong></span>
                <span>SEO:<strong style={{ color: scoreColor(scan.scores.seo) }}>{scan.scores.seo}</strong></span>
              </>
            )}
          </div>
          {/* Finding counts */}
          {scan.totalFindings > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem' }}>
              {scan.critical > 0 && (
                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 4, background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
                  {scan.critical} critical
                </span>
              )}
              {scan.moderate > 0 && (
                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 4, background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                  {scan.moderate} moderate
                </span>
              )}
              {scan.minor > 0 && (
                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 4, background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
                  {scan.minor} minor
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
          <button
            onClick={onCompare}
            title="Select for comparison"
            style={{
              padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid var(--border)',
              background: isCompareSelected ? 'rgba(129,140,248,0.15)' : 'var(--bg)',
              color: isCompareSelected ? '#818cf8' : 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '0.2rem',
              transition: 'all 150ms ease',
            }}
          >
            <GitCompare size={11} />
          </button>
          <button
            onClick={onDelete}
            title="Delete scan"
            style={{
              padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              transition: 'all 150ms ease',
            }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Comparison Panel ──
function ComparePanel({ a, b, onClose }: { a: StoredScan; b: StoredScan; onClose: () => void }) {
  const rows = [
    { label: 'Health Score', valA: a.healthScore, valB: b.healthScore },
    { label: 'Performance', valA: a.scores?.performance ?? null, valB: b.scores?.performance ?? null },
    { label: 'Accessibility', valA: a.scores?.accessibility ?? null, valB: b.scores?.accessibility ?? null },
    { label: 'Best Practices', valA: a.scores?.bestPractices ?? null, valB: b.scores?.bestPractices ?? null },
    { label: 'SEO', valA: a.scores?.seo ?? null, valB: b.scores?.seo ?? null },
    { label: 'Site Audit', valA: a.customAuditScore, valB: b.customAuditScore },
    { label: 'Findings', valA: a.totalFindings, valB: b.totalFindings },
    { label: 'Critical', valA: a.critical, valB: b.critical },
  ]

  return (
    <div className="glass-card animate-fade-up" style={{
      padding: '1.25rem', marginBottom: '1.25rem',
      borderColor: 'rgba(129,140,248,0.25)',
      background: 'rgba(129,140,248,0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <GitCompare size={15} color="#818cf8" />
        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Scan Comparison</span>
        <button onClick={onClose} className="btn-ghost" style={{ marginLeft: 'auto', padding: '0.25rem' }}>
          <X size={14} />
        </button>
      </div>

      {/* Header row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px',
        gap: '0.5rem', marginBottom: '0.5rem', padding: '0 0.5rem',
      }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Metric</div>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#60a5fa', textAlign: 'center' }}>
          Scan A <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>({relativeTime(a.fetchedAt)})</span>
        </div>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a78bfa', textAlign: 'center' }}>
          Scan B <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>({relativeTime(b.fetchedAt)})</span>
        </div>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>Change</div>
      </div>

      {/* Data rows */}
      {rows.map(row => {
        const diff = row.valA !== null && row.valB !== null ? row.valB - row.valA : null
        // For "Findings" and "Critical", lower is better
        const invertedLabels = ['Findings', 'Critical']
        const isInverted = invertedLabels.includes(row.label)
        const isGood = diff !== null && diff !== 0 ? (isInverted ? diff < 0 : diff > 0) : null

        return (
          <div key={row.label} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px',
            gap: '0.5rem', padding: '0.4rem 0.5rem', borderRadius: 6,
            background: 'var(--bg)', marginBottom: '0.25rem',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{row.label}</div>
            <div style={{
              fontSize: '0.82rem', fontWeight: 800, textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              color: row.valA !== null ? scoreColor(row.valA) : 'var(--text-muted)',
            }}>
              {row.valA ?? '—'}
            </div>
            <div style={{
              fontSize: '0.82rem', fontWeight: 800, textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              color: row.valB !== null ? scoreColor(row.valB) : 'var(--text-muted)',
            }}>
              {row.valB ?? '—'}
            </div>
            <div style={{
              fontSize: '0.75rem', fontWeight: 700, textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.15rem',
              color: diff === null || diff === 0 ? 'var(--text-muted)' : isGood ? '#34d399' : '#f87171',
            }}>
              {diff === null ? '—' : diff === 0 ? (
                <><Minus size={11} /> 0</>
              ) : diff > 0 ? (
                <><ArrowUpRight size={11} /> +{diff}</>
              ) : (
                <><ArrowDownRight size={11} /> {diff}</>
              )}
            </div>
          </div>
        )
      })}

      {/* CWV comparison if both have CWV data */}
      {a.cwvSummary && b.cwvSummary && (
        <>
          <div style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0 0.5rem', paddingTop: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Core Web Vitals</span>
          </div>
          {(['lcp', 'inp', 'cls', 'fcp', 'ttfb', 'tbt', 'si'] as const).map(metric => (
            <div key={metric} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px',
              gap: '0.5rem', padding: '0.3rem 0.5rem', borderRadius: 6,
              background: 'var(--bg)', marginBottom: '0.2rem',
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{metric}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>
                {a.cwvSummary![metric]}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>
                {b.cwvSummary![metric]}
              </div>
              <div style={{ fontSize: '0.72rem', textAlign: 'center', color: 'var(--text-muted)' }}>—</div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
