'use client'
import { useState } from 'react'
import { Zap, CheckCircle, ChevronDown, ChevronRight, Copy, ExternalLink } from 'lucide-react'
import type { AuditResult, OpportunityFix } from './types'
import { impactColor } from './utils'

// Lighthouse opportunity fix suggestions (static mapping)
const OPPORTUNITY_FIXES: Record<string, OpportunityFix> = {
  'render-blocking-resources': {
    fix: 'Defer non-critical CSS/JS. Inline critical CSS. Use async/defer on scripts.',
    codeSnippet: '<link rel="preload" href="styles.css" as="style"\n      onload="this.onload=null;this.rel=\'stylesheet\'">\n<script src="app.js" defer></script>',
    docsUrl: 'https://web.dev/articles/render-blocking-resources',
  },
  'uses-optimized-images': {
    fix: 'Compress images with Squoosh or Sharp. Target ~85% quality for JPEG/WebP.',
    codeSnippet: '# Using Sharp (Node.js)\nnpx sharp-cli --input photo.jpg --output photo-opt.jpg --quality 85',
    docsUrl: 'https://web.dev/articles/uses-optimized-images',
  },
  'uses-webp-images': {
    fix: 'Serve images in WebP/AVIF using <picture> for backward compatibility.',
    codeSnippet: '<picture>\n  <source srcset="img.avif" type="image/avif">\n  <source srcset="img.webp" type="image/webp">\n  <img src="img.jpg" alt="Description">\n</picture>',
    docsUrl: 'https://web.dev/articles/uses-webp-images',
  },
  'uses-text-compression': {
    fix: 'Enable Brotli or gzip compression for text-based responses.',
    codeSnippet: '# Nginx: enable Brotli\nbrotli on;\nbrotli_types text/html text/css application/javascript;',
    docsUrl: 'https://web.dev/articles/uses-text-compression',
  },
  'uses-long-cache-ttl': {
    fix: 'Set long Cache-Control headers for static assets with content hashing.',
    codeSnippet: '# Static assets with hash:\nCache-Control: public, max-age=31536000, immutable\n\n# HTML pages:\nCache-Control: no-cache',
    docsUrl: 'https://web.dev/articles/uses-long-cache-ttl',
  },
  'unused-javascript': {
    fix: 'Remove unused JS via tree-shaking, code splitting, and dynamic imports.',
    codeSnippet: 'const Chart = dynamic(\n  () => import(\'./Chart\'),\n  { loading: () => <Skeleton />, ssr: false }\n);',
    docsUrl: 'https://web.dev/articles/unused-javascript',
  },
  'unused-css-rules': {
    fix: 'Remove unused CSS using PurgeCSS or Tailwind\'s content purging.',
    docsUrl: 'https://web.dev/articles/unused-css-rules',
  },
  'dom-size': {
    fix: 'Reduce DOM nodes by removing wrappers and virtualizing long lists.',
    codeSnippet: 'import { FixedSizeList } from \'react-window\';\n\n<FixedSizeList height={600} itemCount={1000} itemSize={50}>\n  {({ index, style }) => <Row key={index} style={style} />}\n</FixedSizeList>',
    docsUrl: 'https://web.dev/articles/dom-size',
  },
  'bootup-time': {
    fix: 'Reduce JS execution time via code splitting and deferring non-critical scripts.',
    docsUrl: 'https://web.dev/articles/bootup-time',
  },
  'mainthread-work-breakdown': {
    fix: 'Break long tasks, defer heavy computation to Web Workers.',
    docsUrl: 'https://web.dev/articles/long-tasks-devtools',
  },
  'uses-rel-preload': {
    fix: 'Preload critical resources (fonts, hero images) discovered late in the waterfall.',
    codeSnippet: '<link rel="preload" href="/fonts/Inter.woff2"\n      as="font" type="font/woff2" crossorigin>',
    docsUrl: 'https://web.dev/articles/uses-rel-preload',
  },
  'uses-rel-preconnect': {
    fix: 'Preconnect to third-party origins to save DNS + TCP + TLS setup time.',
    codeSnippet: '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://cdn.example.com" crossorigin>',
    docsUrl: 'https://web.dev/articles/uses-rel-preconnect',
  },
  'font-display': {
    fix: 'Use font-display: swap to show fallback text immediately while fonts load.',
    codeSnippet: '@font-face {\n  font-family: \'Inter\';\n  src: url(\'/fonts/Inter.woff2\') format(\'woff2\');\n  font-display: swap;\n}',
    docsUrl: 'https://web.dev/articles/font-display',
  },
  'efficient-animated-content': {
    fix: 'Replace GIFs with video (MP4/WebM) for 80%+ smaller file sizes.',
    codeSnippet: '<video autoplay loop muted playsinline>\n  <source src="animation.webm" type="video/webm">\n  <source src="animation.mp4" type="video/mp4">\n</video>',
    docsUrl: 'https://web.dev/articles/replace-gifs-with-videos',
  },
  'uses-passive-event-listeners': {
    fix: 'Use passive event listeners for touch/wheel events.',
    codeSnippet: 'el.addEventListener(\'touchstart\', handler, { passive: true });',
    docsUrl: 'https://web.dev/articles/uses-passive-event-listeners',
  },
  'no-document-write': {
    fix: 'Replace document.write() with DOM manipulation methods.',
    codeSnippet: 'const s = document.createElement(\'script\');\ns.src = \'lib.js\';\ndocument.head.appendChild(s);',
  },
}

export default function OpportunitiesTab({ result }: { result: AuditResult }) {
  const [expandedOps, setExpandedOps] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const toggleOp = (id: string) => {
    setExpandedOps(prev => {
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

  return (
    <div className="glass-card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <Zap size={18} color="#fbbf24" />
        <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>Top Opportunities</h2>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>sorted by impact · click for fix</span>
      </div>
      {(!result.opportunities || result.opportunities.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#34d399' }}>
          <CheckCircle size={32} style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ fontWeight: 700 }}>No major opportunities found!</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>This page is well-optimized.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {result.opportunities.map(op => {
            const fix = OPPORTUNITY_FIXES[op.id]
            const isExpanded = expandedOps.has(op.id)

            return (
              <div key={op.id} style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', overflow: 'hidden', transition: 'all 0.2s' }}>
                {/* Opportunity header */}
                <div
                  onClick={() => fix && toggleOp(op.id)}
                  style={{
                    padding: '1rem 1.25rem',
                    cursor: fix ? 'pointer' : 'default',
                    transition: 'background 150ms',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    {/* Expand chevron */}
                    {fix ? (
                      <span style={{ marginTop: 3, flexShrink: 0, color: 'var(--text-muted)' }}>
                        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </span>
                    ) : (
                      <span style={{ width: 13, flexShrink: 0 }} />
                    )}

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

                {/* Expanded fix panel */}
                {fix && isExpanded && (
                  <div style={{
                    padding: '0.85rem 1.25rem 1rem 3.5rem',
                    borderTop: '1px solid var(--border)',
                    background: 'rgba(251,191,36,0.02)',
                    animation: 'fadeIn 200ms ease-out',
                  }}>
                    {/* Fix text */}
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: 700, color: '#34d399' }}>Fix: </span>
                      {fix.fix}
                    </p>

                    {/* Code snippet */}
                    {fix.codeSnippet && (
                      <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
                        <pre style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem',
                          padding: '0.75rem 1rem', borderRadius: 6,
                          background: '#0d0d14', color: '#c9d1d9',
                          lineHeight: 1.6, overflow: 'auto', maxHeight: 200,
                          border: '1px solid rgba(255,255,255,0.06)',
                          margin: 0,
                        }}>
                          {fix.codeSnippet}
                        </pre>
                        <button
                          onClick={(e) => { e.stopPropagation(); copySnippet(op.id, fix.codeSnippet!) }}
                          style={{
                            position: 'absolute', top: 6, right: 6,
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            padding: '0.2rem 0.5rem', borderRadius: 4,
                            background: copiedId === op.id ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)',
                            color: copiedId === op.id ? '#34d399' : '#94a3b8',
                            border: '1px solid rgba(255,255,255,0.08)',
                            fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer',
                            transition: 'all 150ms',
                          }}
                        >
                          <Copy size={10} />
                          {copiedId === op.id ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    )}

                    {/* Docs link */}
                    {fix.docsUrl && (
                      <a
                        href={fix.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        Learn more on web.dev <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
