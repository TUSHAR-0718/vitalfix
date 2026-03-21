import Link from 'next/link'
import { Zap, Github, Twitter } from 'lucide-react'

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '4rem' }}>
      <div className="container-pad" style={{ padding: '3rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2.5rem' }}>
          {/* Brand */}
          <div>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginBottom: '0.75rem' }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #7c6bff, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={15} color="#fff" fill="#fff" />
              </div>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>VitalFix</span>
            </Link>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Production-ready tools to fix Core Web Vitals and ship faster websites.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}>
                <Github size={18} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}>
                <Twitter size={18} />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Product</p>
            {[
              { href: '/library', label: 'Code Library' },
              { href: '/checklist', label: 'Audit Checklist' },
              { href: '/tools', label: 'Interactive Tools' },
              { href: '/pricing', label: 'Pricing' },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '0.4rem', transition: 'color 0.2s' }}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Metrics */}
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Metrics</p>
            {['LCP (Largest Contentful Paint)', 'INP (Interaction to Next Paint)', 'CLS (Cumulative Layout Shift)', 'TTFB', 'FCP'].map(m => (
              <p key={m} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>{m}</p>
            ))}
          </div>

          {/* Resources */}
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Resources</p>
            {[
              { href: 'https://web.dev/vitals/', label: 'web.dev/vitals' },
              { href: 'https://pagespeed.web.dev/', label: 'PageSpeed Insights' },
              { href: 'https://developer.chrome.com/docs/lighthouse/', label: 'Lighthouse Docs' },
            ].map(l => (
              <a key={l.href} href={l.href} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '0.4rem' }}>
                {l.label} ↗
              </a>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '2.5rem', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>© 2025 VitalFix. Built for developers, by developers.</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Made with ⚡ and a lot of Lighthouse audits</p>
        </div>
      </div>
    </footer>
  )
}
