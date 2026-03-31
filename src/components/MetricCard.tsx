'use client'
import ScoreRing from './ScoreRing'

interface MetricCardProps {
  name: string
  fullName: string
  score: number
  value: string
  good: string
  poor: string
  color: string
}

export default function MetricCard({ name, fullName, score, value, good, poor, color }: MetricCardProps) {
  return (
    <div className="glass-card" style={{
      padding: '1.75rem',
      borderColor: `${color}33`,
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <ScoreRing score={score} size={100} color={color} label={name} />
      </div>
      <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{fullName}</h3>
      <p style={{
        fontSize: '1.4rem', fontWeight: 900, color, marginBottom: '0.75rem',
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        {value}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem' }}>
        <span style={{
          fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: 5,
          background: 'rgba(52,211,153,0.12)', color: '#34d399', fontWeight: 600,
        }}>✓ {good}</span>
        <span style={{
          fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: 5,
          background: 'rgba(248,113,113,0.1)', color: '#f87171', fontWeight: 600,
        }}>✗ {poor}</span>
      </div>
    </div>
  )
}
