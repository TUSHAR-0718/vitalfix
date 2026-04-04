'use client'
import { Eye } from 'lucide-react'
import type { AuditResult } from './types'

export default function DiagnosticsTab({ result }: { result: AuditResult }) {
  return (
    <div className="glass-card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <Eye size={18} color="#60a5fa" />
        <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>Diagnostics</h2>
      </div>
      {(!result.diagnostics || result.diagnostics.length === 0) ? (
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
  )
}
