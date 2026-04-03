'use client'
import { Star, Eye } from 'lucide-react'
import type { AuditResult } from './types'
import { fieldCatColor } from './utils'

export default function FieldDataTab({ result }: { result: AuditResult }) {
  return (
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
              { label: 'LCP (p75)', data: result.fieldData.lcp, format: (v: number) => `${(v / 1000).toFixed(1)} s` },
              { label: 'INP (p75)', data: result.fieldData.inp, format: (v: number) => `${v} ms` },
              { label: 'CLS (p75)', data: result.fieldData.cls, format: (v: number) => (v / 100).toFixed(2) },
              { label: 'FID (p75)', data: result.fieldData.fid, format: (v: number) => `${v} ms` },
            ]).filter(m => m.data).map(m => (
              <div key={m.label} style={{ padding: '1.25rem', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'monospace', color: fieldCatColor(m.data!.category), lineHeight: 1, marginBottom: '0.25rem' }}>
                  {m.format(m.data!.p75)}
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
  )
}
