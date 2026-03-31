'use client'
import { useState } from 'react'
import { Search, AlertTriangle, ArrowRight, Terminal, Globe, Wifi, Smartphone, Monitor, MapPin, GitCompare, Zap, BarChart3, Eye, Shield, Star, ExternalLink, RefreshCw, CheckCircle, XCircle, ShieldCheck, Link2, Image, Code, Type, FileText, Accessibility } from 'lucide-react'
import ScoreRing from '@/components/ScoreRing'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────
type CwvMetric = { value: string; score: number; numericValue?: number }
type FieldDataMetric = { p75: number; category: string } | null
type Severity = 'critical' | 'moderate' | 'minor' | 'info'
type AuditFinding = { id: string; title: string; description: string; severity: Severity; category: string; value?: string; element?: string }
type CategoryResult = { category: string; label: string; score: number; passed: number; failed: number; findings: AuditFinding[] }
type CustomAudit = { url: string; fetchedAt: string; duration: number; overallScore: number; categories: CategoryResult[]; totalFindings: number; critical: number; moderate: number; minor: number }

type AuditResult = {
  url: string
  strategy: string
  fetchedAt: string
  lighthouseVersion?: string
  scores: { performance: number; accessibility: number; bestPractices: number; seo: number }
  cwv: {
    lcp: CwvMetric; inp: CwvMetric; cls: CwvMetric
    fcp: CwvMetric; ttfb: CwvMetric; si: CwvMetric; tbt: CwvMetric
  }
  fieldData: {
    lcp: FieldDataMetric; inp: FieldDataMetric; cls: FieldDataMetric; fid: FieldDataMetric
    overallCategory: string
  } | null
  opportunities: { id: string; title: string; description: string; score: number; displayValue: string; impact: string }[]
  diagnostics: { id: string; title: string; displayValue: string; score: number | null }[]
  customAudit?: CustomAudit
  healthScore?: number
  fromCache?: boolean
}

// ── Simulated waterfall (always shown) ──
const waterfallItems = [
  { label: 'Document (HTML)', type: 'html',  color: '#818cf8', offset: 0,   width: 12 },
  { label: 'main.css',        type: 'css',   color: '#60a5fa', offset: 10,  width: 8 },
  { label: 'runtime.js',      type: 'js',    color: '#fbbf24', offset: 12,  width: 18 },
  { label: 'hero-image.webp', type: 'img',   color: '#34d399', offset: 14,  width: 22 },
  { label: 'Inter font',      type: 'font',  color: '#a78bfa', offset: 16,  width: 14 },
  { label: 'app.chunk.js',    type: 'js',    color: '#fbbf24', offset: 22,  width: 30 },
  { label: 'analytics.js',    type: 'js',    color: '#fbbf24', offset: 30,  width: 20 },
  { label: '/api/data',       type: 'xhr',   color: '#f87171', offset: 35,  width: 25 },
  { label: 'lazy-component',  type: 'js',    color: '#fbbf24', offset: 50,  width: 18 },
  { label: 'thumbnail.webp',  type: 'img',   color: '#34d399', offset: 55,  width: 12 },
]
const typeColors: Record<string, string> = {
  html: '#818cf8', css: '#60a5fa', js: '#fbbf24', img: '#34d399', font: '#a78bfa', xhr: '#f87171'
}

const filmStrip = [
  { label: '0.0s', fill: 5 }, { label: '0.5s', fill: 22 },
  { label: '1.0s', fill: 48 }, { label: '1.5s', fill: 71 },
  { label: '2.0s', fill: 88 }, { label: '2.5s', fill: 100 },
]

const impactColor: Record<string, string> = { high: '#f87171', medium: '#fbbf24', low: '#34d399' }
const catColor: Record<string, string> = { LCP: '#60a5fa', INP: '#34d399', CLS: '#fbbf24', General: '#818cf8' }
const severityColor: Record<string, string> = { critical: '#f87171', moderate: '#fbbf24', minor: '#60a5fa', info: 'var(--text-muted)' }
const categoryIcon: Record<string, any> = {
  'broken-links': Link2, images: Image, assets: Code, 'meta-tags': FileText,
  headings: Type, security: ShieldCheck, mobile: Smartphone, accessibility: Accessibility,
}

const connections = ['4G (Fast)', '4G (Slow)', '3G', 'Cable']
const locations = ['US East (Virginia)', 'EU West (London)', 'Asia (Singapore)', 'AU (Sydney)']

// ── Score color helper ──
const scoreColor = (s: number) => s >= 90 ? '#34d399' : s >= 50 ? '#fbbf24' : '#f87171'
const scoreLabel = (s: number) => s >= 90 ? 'Good' : s >= 50 ? 'Needs Improvement' : 'Poor'

const fieldCatColor = (cat: string) => {
  if (cat === 'FAST') return '#34d399'
  if (cat === 'AVERAGE') return '#fbbf24'
  return '#f87171'
}

// ── Category score card ──
function CategoryScore({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 900, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{score}</div>
      <div style={{ fontSize: '0.7rem', marginTop: '0.3rem', color, fontWeight: 600 }}>{scoreLabel(score)}</div>
    </div>
  )
}

// ── Main component ──
export default function DashboardPage() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<AuditResult | null>(null)
  const [prevResult, setprevResult] = useState<AuditResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile')
  const [location, setLocation] = useState('US East (Virginia)')
  const [connection, setConnection] = useState('4G (Fast)')
  const [runCount, setRunCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'overview' | 'opportunities' | 'diagnostics' | 'field' | 'siteaudit'>('overview')

  const runAudit = async () => {
    if (!url.trim()) return
    let targetUrl = url.trim()
    if (!/^https?:\/\//.test(targetUrl)) targetUrl = 'https://' + targetUrl

    setLoading(true)
    setError(null)
    setprevResult(result)
    setResult(null)
    setActiveTab('overview')

    try {
      const res = await fetch(`/api/audit/full?url=${encodeURIComponent(targetUrl)}&strategy=${device}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Audit failed')
      setResult(data)
      setRunCount(c => c + 1)
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Check the URL and try again.')
    } finally {
      setLoading(false)
    }
  }

  const delta = (curr: number, prev: number) => {
    const d = curr - prev
    const color = d > 0 ? '#34d399' : d < 0 ? '#f87171' : 'var(--text-muted)'
    return { label: d > 0 ? `▲ +${d}` : d < 0 ? `▼ ${d}` : '—', color }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Header ── */}
      <section style={{ padding: '4rem 0 2.5rem', borderBottom: '1px solid var(--border)' }}>
        <div className="container-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span className="badge badge-accent">Performance Dashboard</span>
            <span className="badge badge-green">⚡ Real Lighthouse</span>
          </div>
          <h1 className="text-h1" style={{ marginBottom: '0.5rem' }}>
            Real-Time <span className="gradient-text">Lighthouse Audit</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 540, lineHeight: 1.6 }}>
            Enter any URL to run a live audit — real scores, real CWV data, real opportunities.
          </p>
        </div>
      </section>

      <div className="container-pad" style={{ padding: '2.5rem 1.5rem' }}>
        {/* ── Input panel ── */}
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', borderColor: loading ? 'rgba(129,140,248,0.25)' : 'var(--border)', transition: 'border-color 200ms' }}>
          {/* URL + Run */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <div style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.85rem', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <Globe size={15} color="var(--text-muted)" />
              <input
                id="url-input"
                type="text"
                placeholder="example.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runAudit()}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: "'JetBrains Mono', monospace" }}
              />
            </div>

            {/* Device toggle */}
            <div style={{ display: 'flex', gap: '0.25rem', padding: '0.2rem', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
              {(['mobile', 'desktop'] as const).map(d => (
                <button key={d} onClick={() => setDevice(d)} style={{ padding: '0.4rem 0.7rem', borderRadius: 6, cursor: 'pointer', border: 'none', fontSize: '0.78rem', fontWeight: 500, background: device === d ? 'var(--bg-card)' : 'transparent', color: device === d ? 'var(--text-primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'all 150ms' }}>
                  {d === 'mobile' ? <Smartphone size={13} /> : <Monitor size={13} />}
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>

            <button id="run-audit-btn" onClick={runAudit} disabled={loading} className="btn-primary" style={{ opacity: loading ? 0.85 : 1, minWidth: 110 }}>
              {loading ? <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Search size={14} />}
              {loading ? 'Running…' : 'Run Audit'}
            </button>
          </div>

          {/* Location + Connection */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <MapPin size={12} color="var(--text-muted)" />
              <select value={location} onChange={e => setLocation(e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.3rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                {locations.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Wifi size={12} color="var(--text-muted)" />
              <select value={connection} onChange={e => setConnection(e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.3rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
                {connections.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <span className="text-label" style={{ marginLeft: 'auto' }}>PageSpeed Insights API</span>
          </div>
        </div>

        {/* ── Loading state ── */}
        {loading && (
          <div style={{ padding: '3rem 1.5rem' }}>
            {/* Progress bar */}
            <div style={{ height: 2, borderRadius: 1, background: 'var(--border)', marginBottom: '2rem', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 1, background: 'linear-gradient(90deg, var(--accent), #60a5fa)', animation: 'progress-bar 20s ease-out forwards' }} />
            </div>
            {/* Skeleton cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[1,2,3,4].map(i => (
                <div key={i} className="skeleton" style={{ height: 80 }} />
              ))}
            </div>
            <div className="skeleton" style={{ height: 200, marginBottom: '1rem' }} />
            <div className="skeleton" style={{ height: 120 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', marginTop: '1.5rem' }}>
              Running Lighthouse + Site Audit for <strong style={{ color: 'var(--accent)' }}>{url}</strong> · {device}
            </p>
          </div>
        )}

        {/* ── Error state ── */}
        {error && !loading && (
          <div style={{ padding: '1.5rem', borderRadius: 12, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.25)', marginBottom: '2rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <XCircle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontWeight: 700, color: '#f87171', marginBottom: '0.25rem' }}>Audit Failed</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{error}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                Make sure the URL is publicly accessible and starts with http:// or https://
              </p>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {result && !loading && (
          <div className="animate-fade-up">
            {/* Meta bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <CheckCircle size={16} color="#34d399" />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Audited: <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{result.url}</strong>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>·</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {result.strategy} · Lighthouse {result.lighthouseVersion} · {new Date(result.fetchedAt).toLocaleTimeString()}
              </span>
              <a href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(result.url)}`} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                View on PSI <ExternalLink size={12} />
              </a>
            </div>

            {/* ── Health Score hero (combined) ── */}
            {result.healthScore !== undefined && (
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(52,211,153,0.06), rgba(129,140,248,0.06))', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <ShieldCheck size={16} color="#34d399" />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Overall Health Score</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, marginLeft: '0.5rem', padding: '0.15rem 0.5rem', borderRadius: 4, background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
                    Lighthouse + Site Audit
                  </span>
                  {result.fromCache && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 4, background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)', marginLeft: '0.25rem' }}>Cached</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  <ScoreRing score={result.healthScore} size={130} color={scoreColor(result.healthScore)} label="Health" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>Lighthouse: <strong style={{ color: scoreColor(result.scores.performance) }}>{result.scores.performance}</strong> (60%)</span>
                  <span>Site Audit: <strong style={{ color: scoreColor(result.customAudit?.overallScore ?? 0) }}>{result.customAudit?.overallScore ?? '—'}</strong> (40%)</span>
                </div>
                {result.customAudit && result.customAudit.totalFindings > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                    {result.customAudit.critical > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 6, background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>{result.customAudit.critical} Critical</span>}
                    {result.customAudit.moderate > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 6, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>{result.customAudit.moderate} Moderate</span>}
                    {result.customAudit.minor > 0 && <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 6, background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}>{result.customAudit.minor} Minor</span>}
                  </div>
                )}
              </div>
            )}

            {/* ── Performance Score — HERO ── */}
            <div className="glass-card" style={{ padding: '2rem', marginBottom: '1.5rem', background: 'linear-gradient(160deg, rgba(129,140,248,0.06), transparent)', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <Zap size={16} color="#818cf8" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Lighthouse Performance Score</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, marginLeft: '0.5rem', padding: '0.15rem 0.5rem', borderRadius: 4, background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
                  Lab Data
                </span>
              </div>

              {/* Large Performance Ring */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <ScoreRing score={result.scores.performance} size={150} color={scoreColor(result.scores.performance)} label="Performance" />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto' }}>
                Lab score from Google Lighthouse ({result.strategy}) — simulated page load in a controlled environment. <strong style={{ color: 'var(--text-secondary)' }}>This is the same engine used by PageSpeed Insights.</strong>
              </p>

              {/* Other 3 scores — smaller, below */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                {([
                  { label: 'Accessibility', val: result.scores.accessibility },
                  { label: 'Best Practices', val: result.scores.bestPractices },
                  { label: 'SEO', val: result.scores.seo },
                ]).map(s => (
                  <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <ScoreRing score={s.val} size={70} color={scoreColor(s.val)} label="" />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Lab vs Field explainer — shown when CrUX data exists ── */}
            {result.fieldData && (
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderColor: 'rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <AlertTriangle size={16} color="#a78bfa" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Lab Score vs Real-User Data</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '1rem', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Lab (Lighthouse)</div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: scoreColor(result.scores.performance), fontFamily: 'JetBrains Mono, monospace' }}>{result.scores.performance}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Simulated · Single run</div>
                  </div>
                  <div style={{ padding: '1rem', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Field (CrUX)</div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: fieldCatColor(result.fieldData.overallCategory), fontFamily: 'JetBrains Mono, monospace' }}>{result.fieldData.overallCategory}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Real users · 28-day avg</div>
                  </div>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Why do scores differ?</strong> Lab data is a single simulated test. Field data (Chrome UX Report) reflects real user experiences over 28 days. Tools like DebugBear, Search Console, and CrUX dashboards show <em>field</em> data. Lighthouse and PageSpeed Insights primarily show <em>lab</em> data. Both are important — lab data helps debug, field data reflects reality.
                </p>
              </div>
            )}

            {/* ── Before/After comparison ── */}
            {prevResult && (
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderColor: 'rgba(129,140,248,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <GitCompare size={16} color="#818cf8" />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Before vs After</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Run #{runCount - 1} → Run #{runCount}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                  {([
                    { label: 'Performance', prev: prevResult.scores.performance, curr: result.scores.performance },
                    { label: 'Accessibility', prev: prevResult.scores.accessibility, curr: result.scores.accessibility },
                    { label: 'Best Practices', prev: prevResult.scores.bestPractices, curr: result.scores.bestPractices },
                    { label: 'SEO', prev: prevResult.scores.seo, curr: result.scores.seo },
                  ]).map(row => {
                    const d = delta(row.curr, row.prev)
                    return (
                      <div key={row.label} style={{ padding: '0.85rem 1rem', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{row.label}</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{row.prev}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>→</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 800 }}>{row.curr}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: d.color, marginTop: '0.25rem' }}>{d.label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Tab navigation — underline style ── */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
              {([
                { id: 'overview', label: 'Core Web Vitals', icon: <BarChart3 size={13} /> },
                { id: 'siteaudit', label: `Site Audit (${result.customAudit?.totalFindings ?? 0})`, icon: <ShieldCheck size={13} /> },
                { id: 'opportunities', label: `Opportunities (${result.opportunities.length})`, icon: <Zap size={13} /> },
                { id: 'diagnostics', label: 'Diagnostics', icon: <Eye size={13} /> },
                { id: 'field', label: 'Field Data', icon: <Star size={13} /> },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`tab-underline${activeTab === t.id ? ' active' : ''}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* ── Overview tab: CWV metrics ── */}
            {activeTab === 'overview' && (
              <div>
                <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  {([
                    { key: 'lcp', label: 'LCP', full: 'Largest Contentful Paint', color: '#60a5fa' },
                    { key: 'inp', label: 'INP', full: 'Interaction to Next Paint', color: '#34d399' },
                    { key: 'cls', label: 'CLS', full: 'Cumulative Layout Shift', color: '#fbbf24' },
                    { key: 'fcp', label: 'FCP', full: 'First Contentful Paint', color: '#a78bfa' },
                    { key: 'ttfb', label: 'TTFB', full: 'Server Response Time', color: '#ec4899' },
                    { key: 'tbt', label: 'TBT', full: 'Total Blocking Time', color: '#ef4444' },
                    { key: 'si', label: 'SI', full: 'Speed Index', color: '#f59e0b' },
                  ] as const).map(m => {
                    const data = result.cwv[m.key]
                    return (
                      <div key={m.key} className="glass-card" style={{ padding: '1.5rem', borderColor: `${m.color}33` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: m.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.key.toUpperCase()}</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: 4, background: `${scoreColor(data.score)}18`, color: scoreColor(data.score) }}>
                            {scoreLabel(data.score)}
                          </span>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: scoreColor(data.score), fontFamily: 'JetBrains Mono, monospace', lineHeight: 1, marginBottom: '0.3rem' }}>
                          {data.value}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.full}</div>
                        {/* Score bar */}
                        <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', marginTop: '0.75rem', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${data.score}%`, background: scoreColor(data.score), borderRadius: 2, transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Waterfall chart */}
                <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399' }} />
                    <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Network Waterfall</h2>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'monospace' }}>simulated layout · real metrics above</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {Object.entries(typeColors).map(([type, color]) => (
                      <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{type}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {waterfallItems.map((item, i) => (
                      <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.75rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace' }}>{item.label}</span>
                        <div style={{ position: 'relative', height: 22, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                          <div className="waterfall-bar" style={{ position: 'absolute', left: `${item.offset}%`, width: `${item.width}%`, background: `linear-gradient(90deg, ${item.color}cc, ${item.color})`, animationDelay: `${i * 60}ms` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filmstrip */}
                <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa' }} />
                    <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Filmstrip View</h2>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>simulated page-load progression</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {filmStrip.map((frame, i) => (
                      <div key={frame.label} className="filmstrip-frame" style={{ animationDelay: `${i * 80}ms`, minWidth: 100 }}>
                        <div style={{ height: 70, background: 'var(--bg-secondary)', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${frame.fill}%`, background: 'linear-gradient(180deg, transparent, rgba(96,165,250,0.15))' }} />
                          {frame.fill > 10 && <div style={{ position: 'absolute', top: 8, left: 8, right: 8, height: 8, borderRadius: 2, background: 'var(--border)', opacity: Math.min(1, frame.fill / 30) }} />}
                          {frame.fill > 30 && <div style={{ position: 'absolute', top: 22, left: 8, right: 20, height: 18, borderRadius: 3, background: 'rgba(96,165,250,0.25)', opacity: Math.min(1, (frame.fill - 20) / 30) }} />}
                          {frame.fill > 60 && <div style={{ position: 'absolute', top: 46, left: 8, right: 30, height: 6, borderRadius: 2, background: 'var(--border)', opacity: Math.min(1, (frame.fill - 50) / 30) }} />}
                          {frame.fill >= 100 && <div style={{ position: 'absolute', inset: 0, border: '2px solid #43e97b', borderRadius: 0 }} />}
                        </div>
                        <div style={{ padding: '0.4rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace', color: frame.fill >= 100 ? '#34d399' : 'var(--text-muted)' }}>{frame.label}</div>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{frame.fill}% loaded</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Opportunities tab ── */}
            {activeTab === 'opportunities' && (
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
            )}

            {/* ── Diagnostics tab ── */}
            {activeTab === 'diagnostics' && (
              <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <Eye size={18} color="#60a5fa" />
                  <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>Diagnostics</h2>
                </div>
                {result.diagnostics.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No diagnostic data available for this URL.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {result.diagnostics.map(d => (
                      <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.1rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.score === null ? 'var(--blue)' : d.score >= 0.9 ? '#34d399' : d.score >= 0.5 ? '#fbbf24' : '#f87171', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.875rem', flex: 1 }}>{d.title}</span>
                        {d.displayValue && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{d.displayValue}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Field Data (CrUX) tab ── */}
            {activeTab === 'field' && (
              <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <Star size={18} color="#a78bfa" />
                  <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>Field Data (Chrome UX Report)</h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Real user data · p75</span>
                </div>
                {!result.fieldData ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <Eye size={28} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
                    <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>No CrUX field data available</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', maxWidth: 380, margin: '0.5rem auto 0' }}>
                      Field data (real user experience) is only available for pages with sufficient Chrome traffic. Try a high-traffic URL.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1.25rem', borderRadius: 8, background: fieldCatColor(result.fieldData.overallCategory) === '#34d399' ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: fieldCatColor(result.fieldData.overallCategory) }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: fieldCatColor(result.fieldData.overallCategory) }}>
                        Overall CrUX: {result.fieldData.overallCategory}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      {([
                        { label: 'LCP (p75)', data: result.fieldData.lcp, unit: 'ms' },
                        { label: 'INP (p75)', data: result.fieldData.inp, unit: 'ms' },
                        { label: 'CLS (p75)', data: result.fieldData.cls, unit: '' },
                        { label: 'FID (p75)', data: result.fieldData.fid, unit: 'ms' },
                      ]).filter(m => m.data).map(m => (
                        <div key={m.label} style={{ padding: '1.25rem', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>{m.label}</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'monospace', color: fieldCatColor(m.data!.category), lineHeight: 1, marginBottom: '0.25rem' }}>
                            {m.data!.p75}{m.unit}
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 4, background: `${fieldCatColor(m.data!.category)}15`, color: fieldCatColor(m.data!.category) }}>
                            {m.data!.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Site Audit tab ── */}
            {activeTab === 'siteaudit' && (
              <div>
                {!result.customAudit ? (
                  <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Custom audit data not available</p>
                  </div>
                ) : (
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
                      const IconComp = categoryIcon[cat.category] || Shield
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
                )}
              </div>
            )}

            {/* ── CTA ── */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
              <Link href="/library" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                Get Fix Code <ArrowRight size={16} />
              </Link>
              <Link href="/checklist" className="btn-secondary" style={{ textDecoration: 'none' }}>Run Full Checklist</Link>
            </div>
          </div>
        )}

        {/* ── How to run a real audit (shown when no result yet) ── */}
        {!result && !loading && !error && (
          <section style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
              Other Ways to Audit
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Terminal size={16} color="var(--accent)" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Lighthouse CLI</span>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', padding: '0.75rem 1rem', borderRadius: 8, background: '#0d0d14', color: '#c9d1d9', lineHeight: 1.7 }}>
                  <div><span style={{ color: '#34d399' }}>$</span> npx lighthouse https://your-site.com \</div>
                  <div>&nbsp;&nbsp;--preset=desktop --output=html</div>
                </div>
              </div>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Search size={16} color="#60a5fa" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>PageSpeed Insights</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Visit <a href="https://pagespeed.web.dev" target="_blank" rel="noreferrer" style={{ color: '#60a5fa', fontWeight: 600 }}>pagespeed.web.dev</a> for both field data (CrUX) and lab data in one report.
                </p>
              </div>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Wifi size={16} color="#fbbf24" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>WebPageTest</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <a href="https://www.webpagetest.org" target="_blank" rel="noreferrer" style={{ color: '#fbbf24', fontWeight: 600 }}>webpagetest.org</a> — waterfall charts, filmstrip, multi-location testing.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
