'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, BarChart3, Share2 } from 'lucide-react'

// Notification content pool — rotates through these
const NOTIFICATIONS = [
  { icon: <TrendingUp size={14} />, text: 'Alex M. improved LCP by 56%', color: '#34d399', delay: 0 },
  { icon: <BarChart3 size={14} />, text: '{auditsToday} audits run today', color: '#818cf8', delay: 12000 },
  { icon: <Share2 size={14} />, text: 'Priya R. shared an audit report', color: '#60a5fa', delay: 24000 },
  { icon: <TrendingUp size={14} />, text: 'Jordan K. improved INP by 68%', color: '#fbbf24', delay: 36000 },
]

export default function SocialProof() {
  const [current, setCurrent] = useState<number | null>(null)
  const [auditsToday, setAuditsToday] = useState(0)
  const [visible, setVisible] = useState(false)

  // Fetch live audit count
  useEffect(() => {
    fetch('/api/stats/live')
      .then(res => res.json())
      .then(data => setAuditsToday(data.auditsToday || 0))
      .catch(() => {})
  }, [])

  // Cycle through notifications
  const showNotification = useCallback((index: number) => {
    setCurrent(index)
    setVisible(true)

    // Auto-hide after 4 seconds
    const hideTimer = setTimeout(() => setVisible(false), 4000)

    // Schedule next notification
    const nextTimer = setTimeout(() => {
      showNotification((index + 1) % NOTIFICATIONS.length)
    }, 12000) // Show a new one every 12 seconds

    return () => {
      clearTimeout(hideTimer)
      clearTimeout(nextTimer)
    }
  }, [])

  useEffect(() => {
    // Don't show on mobile (too intrusive)
    if (window.innerWidth < 768) return

    // Start after 5 second delay
    const startTimer = setTimeout(() => showNotification(0), 5000)
    return () => clearTimeout(startTimer)
  }, [showNotification])

  if (current === null) return null

  const notification = NOTIFICATIONS[current]
  const displayText = notification.text.replace('{auditsToday}', String(auditsToday || '50+'))

  return (
    <div
      style={{
        position: 'fixed', bottom: 24, left: 24, zIndex: 900,
        padding: '0.65rem 1rem',
        borderRadius: 12,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        fontSize: '0.78rem', fontWeight: 500,
        color: 'var(--text-secondary)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: visible ? 'auto' : 'none',
        maxWidth: 320,
      }}
    >
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 7,
        background: `${notification.color}12`,
        color: notification.color,
        flexShrink: 0,
      }}>
        {notification.icon}
      </span>
      <span style={{ lineHeight: 1.4 }}>{displayText}</span>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: notification.color,
        flexShrink: 0,
        animation: 'pulse-glow 2s ease infinite',
      }} />
    </div>
  )
}
