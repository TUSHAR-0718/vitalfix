import Link from 'next/link'
import { ArrowRight, Zap, BarChart3, Code2, CheckSquare, Gauge, TrendingUp, Shield } from 'lucide-react'

const stats = [
  { value: '53%', label: 'of users leave if load > 3s', color: 'var(--red)' },
  { value: '1s', label: 'LCP delay = 7% drop in conversions', color: 'var(--orange)' },
  { value: '90%', label: 'of pages fail Core Web Vitals', color: 'var(--accent)' },
  { value: '2×', label: 'better ranking with good CWV', color: 'var(--green)' },
]

const features = [
  {
    icon: <Code2 size={22} />,
    title: 'Code Library',
    desc: 'Production-ready snippets for LCP images, layout shift fixes, INP optimisation, lazy loading, and more.',
    href: '/library',
    color: '#7c6bff',
    glow: 'rgba(124,107,255,0.12)',
  },
  {
    icon: <CheckSquare size={22} />,
    title: 'Audit Checklist',
    desc: 'Interactive 40-point checklist covering LCP, INP, CLS, TTFB with a real-time score tracker.',
    href: '/checklist',
    color: '#43e97b',
    glow: 'rgba(67,233,123,0.12)',
  },
  {
    icon: <Gauge size={22} />,
    title: 'Interactive Tools',
    desc: 'Visual explainers — adjust sliders and instantly see how your changes affect CWV scores.',
    href: '/tools',
    color: '#38bdf8',
    glow: 'rgba(56,189,248,0.12)',
  },
]

const metrics = [
  { name: 'LCP', full: 'Largest Contentful Paint', good: '< 2.5s', bad: '> 4.0s', desc: 'Time for largest visible element to load. Affects perceived load speed most.', color: '#38bdf8' },
  { name: 'INP', full: 'Interaction to Next Paint', good: '< 200ms', bad: '> 500ms', desc: 'Responsiveness of the page to user interactions like clicks and taps.', color: '#43e97b' },
  { name: 'CLS', full: 'Cumulative Layout Shift', good: '< 0.1', bad: '> 0.25', desc: 'Visual stability — measures unexpected layout shifts as page loads.', color: '#f7971e' },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '7rem 0 5rem' }}>
        {/* Glow orbs */}
        <div className="hero-glow" style={{ width: 600, height: 600, background: '#7c6bff', top: -200, left: -100 }} />
        <div className="hero-glow" style={{ width: 400, height: 400, background: '#38bdf8', top: 0, right: -100 }} />

        <div className="container-pad" style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', borderRadius: 100, border: '1px solid rgba(124,107,255,0.3)', background: 'rgba(124,107,255,0.08)', marginBottom: '2rem' }}>
            <Zap size={13} color="#7c6bff" fill="#7c6bff" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#7c6bff', letterSpacing: '0.04em' }}>CORE WEB VITALS TOOLKIT</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>
            Fix Your Core Web Vitals.<br />
            <span className="gradient-text">Ship Faster. Rank Higher.</span>
          </h1>

          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'var(--text-secondary)', maxWidth: 580, margin: '0 auto 2.5rem', lineHeight: 1.75 }}>
            Production-ready code snippets, interactive audit checklists, and developer tools to improve LCP, INP, and CLS — for free.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/library" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
              Browse Code Library <ArrowRight size={16} />
            </Link>
            <Link href="/checklist" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
              Run Audit Checklist
            </Link>
          </div>

          {/* Floating score badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '3.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'LCP', score: 'Good', color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
              { label: 'INP', score: 'Optimised', color: '#43e97b', bg: 'rgba(67,233,123,0.08)' },
              { label: 'CLS', score: 'Stable', color: '#f7971e', bg: 'rgba(247,151,30,0.08)' },
            ].map(s => (
              <div key={s.label} style={{ padding: '0.6rem 1.2rem', borderRadius: 10, border: `1px solid ${s.color}33`, background: s.bg, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: s.color }}>{s.label}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.score}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: '4rem 0', background: 'var(--bg-secondary)' }}>
        <div className="container-pad">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {stats.map(s => (
              <div key={s.label} className="glass-card" style={{ padding: '1.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, color: s.color, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '0.845rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics explainer */}
      <section className="section-pad">
        <div className="container-pad">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span className="badge badge-blue" style={{ marginBottom: '1rem' }}>The Three Pillars</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>
              What Are Core Web Vitals?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', maxWidth: 520, margin: '0.75rem auto 0' }}>
              Google&apos;s three key metrics that define real-world user experience — and directly impact your search ranking.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {metrics.map(m => (
              <div key={m.name} className="glass-card" style={{ padding: '2rem', borderColor: `${m.color}33` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontWeight: 900, fontSize: '1.1rem', color: m.color }}>{m.name}</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{m.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.full}</div>
                  </div>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1rem' }}>{m.desc}</p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: 6, background: 'rgba(67,233,123,0.12)', color: '#43e97b', fontWeight: 600 }}>✓ Good: {m.good}</span>
                  <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: 6, background: 'rgba(255,107,107,0.1)', color: '#ff6b6b', fontWeight: 600 }}>✗ Poor: {m.bad}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '5rem 0', background: 'var(--bg-secondary)' }}>
        <div className="container-pad">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <span className="badge badge-accent" style={{ marginBottom: '1rem' }}>Everything You Need</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Built for Working Developers
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {features.map(f => (
              <Link key={f.title} href={f.href} style={{ textDecoration: 'none' }}>
                <div className="glass-card" style={{ padding: '2rem', height: '100%', cursor: 'pointer', borderColor: `${f.color}22` }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: f.glow, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, marginBottom: '1.25rem' }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.6rem', color: 'var(--text-primary)' }}>{f.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1.25rem' }}>{f.desc}</p>
                  <span style={{ fontSize: '0.84rem', fontWeight: 600, color: f.color, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    Explore <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ padding: '5rem 0' }}>
        <div className="container-pad">
          <div style={{
            borderRadius: 20, padding: 'clamp(2.5rem,5vw,4rem)',
            background: 'linear-gradient(135deg, rgba(124,107,255,0.15) 0%, rgba(56,189,248,0.08) 100%)',
            border: '1px solid rgba(124,107,255,0.25)',
            textAlign: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(124,107,255,0.1)', top: -100, right: -100, filter: 'blur(60px)' }} />
            <TrendingUp size={36} color="#7c6bff" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
              Start Fixing Your Web Vitals Today
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 2rem', lineHeight: 1.7 }}>
              Join developers who&apos;ve improved their Core Web Vitals scores and boosted their site rankings.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/library" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                Get the Code Snippets <ArrowRight size={16} />
              </Link>
              <Link href="/pricing" className="btn-secondary" style={{ textDecoration: 'none' }}>View Pro Plan</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
