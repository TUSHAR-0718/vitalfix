// ── Dynamic OG Image Generator ──
// GET /api/og?title=...&score=...&category=...
// Uses next/og ImageResponse for dynamic social card generation.

import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'VitalFix — Web Vitals Intelligence'
  const score = searchParams.get('score') // e.g. "67"
  const category = searchParams.get('category') // e.g. "LCP"

  const scoreNum = score ? parseInt(score) : null
  const scoreColor = scoreNum !== null
    ? scoreNum >= 90 ? '#34d399' : scoreNum >= 50 ? '#fbbf24' : '#f87171'
    : '#818cf8'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          background: 'linear-gradient(135deg, #0a0a12 0%, #111127 50%, #0a0a12 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '60px',
          position: 'relative',
        }}
      >
        {/* Subtle gradient orb */}
        <div
          style={{
            position: 'absolute', top: '-80px', right: '-80px',
            width: '400px', height: '400px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#818cf8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', color: 'white', fontWeight: 800,
            }}
          >
            ⚡
          </div>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#e2e8f0' }}>
            VitalFix
          </span>
        </div>

        {/* Score (if provided) */}
        {scoreNum !== null && (
          <div
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                fontSize: '96px', fontWeight: 800,
                color: scoreColor,
                lineHeight: 1,
              }}
            >
              {scoreNum}
            </div>
            <div style={{ fontSize: '18px', color: '#94a3b8', fontWeight: 500 }}>
              / 100 {category ? `${category} Score` : 'Health Score'}
            </div>
          </div>
        )}

        {/* Title */}
        <div
          style={{
            fontSize: scoreNum !== null ? '28px' : '42px',
            fontWeight: 800,
            color: '#e2e8f0',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.3,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '18px', color: '#64748b',
            marginTop: '16px', fontWeight: 500,
          }}
        >
          Core Web Vitals Intelligence Platform
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
