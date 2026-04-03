import { Check, Zap, Shield, Star } from 'lucide-react'
import Link from 'next/link'

const plans = [
  {
    name: 'Free',
    price: '$0',
    per: 'forever',
    desc: 'Everything you need to get started fixing Core Web Vitals.',
    color: 'var(--accent)',
    features: [
      '8 production code snippets',
      'LCP, CLS, INP, Lazy Loading',
      '40-point audit checklist',
      'Interactive score tools',
      'Metric explainer guides',
      'Community access',
    ],
    cta: 'Get Started Free',
    href: '/library',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$29',
    per: 'per month',
    desc: 'Advanced tools, monitoring, and CI integration for professional devs.',
    color: '#818cf8',
    features: [
      'Everything in Free',
      '60+ curated code snippets',
      'CI/CD Lighthouse integration',
      'Real User Monitoring (RUM) dashboard',
      'Automated CWV regression alerts',
      'Priority email support',
      'Team workspace (up to 5 members)',
      'Custom performance budgets',
    ],
    cta: 'Start 14-day Trial',
    href: '#',
    highlight: true,
  },
  {
    name: 'Teams',
    price: '$99',
    per: 'per month',
    desc: 'Full-stack CWV observability for agencies and growing startups.',
    color: '#60a5fa',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Multi-site monitoring',
      'Slack & PagerDuty alerts',
      'Dedicated onboarding call',
      'SLA guarantee',
      'White-label reporting',
      'Custom snippet library',
    ],
    cta: 'Contact Sales',
    href: '#',
    highlight: false,
  },
]

const faqs = [
  { q: 'Is the free plan actually free forever?', a: 'Yes. The code snippets, audit checklist, and interactive tools are completely free with no trial period.' },
  { q: 'What is included in the Real User Monitoring dashboard?', a: 'You get a field data dashboard powered by the Web Vitals JS library, showing p75 scores per page, device type, and connection speed over time.' },
  { q: 'Can I cancel my Pro subscription anytime?', a: 'Absolutely. Cancel anytime from your billing dashboard with no questions asked and no cancellation fees.' },
  { q: 'Do you offer a discount for freelancers or students?', a: 'Yes — email us at hello@vitalfix.dev with proof of student status or your freelancer portfolio for a 50% discount.' },
]

export default function PricingPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <section style={{ padding: '5rem 0 3rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'center' }}>
        <div className="container-pad">
          <span className="badge badge-accent" style={{ marginBottom: '1rem' }}>Pricing</span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
            Simple, <span className="gradient-text">Transparent Pricing</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            Start free. Upgrade only when you need monitoring and team features.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section style={{ padding: '4rem 0' }}>
        <div className="container-pad">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {plans.map(p => (
              <div key={p.name} style={{
                borderRadius: 20, padding: '2.25rem',
                border: `1px solid ${p.highlight ? p.color + '50' : 'var(--border)'}`,
                background: p.highlight ? `linear-gradient(160deg, ${p.color}12, transparent)` : 'var(--bg-card)',
                position: 'relative',
                boxShadow: p.highlight ? `0 0 40px ${p.color}18` : 'none',
              }}>
                {p.highlight && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    padding: '0.3rem 1rem', borderRadius: 100,
                    background: `linear-gradient(90deg, #7c6bff, #38bdf8)`,
                    fontSize: '0.75rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                  }}>
                    <Star size={11} fill="#fff" /> Most Popular
                  </div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: p.color, marginBottom: '0.5rem' }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '2.8rem', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>{p.price}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.per}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{p.desc}</p>
                </div>

                <Link href={p.href} style={{
                  display: 'block', textAlign: 'center', textDecoration: 'none',
                  padding: '0.75rem 1.5rem', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem',
                  background: p.highlight ? `linear-gradient(135deg, #7c6bff, #38bdf8)` : 'var(--bg)',
                  color: p.highlight ? '#fff' : 'var(--text-primary)',
                  border: p.highlight ? 'none' : '1px solid var(--border)',
                  marginBottom: '1.75rem',
                  transition: 'all 0.2s',
                }}>
                  {p.cta}
                </Link>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                      <Check size={15} color={p.color} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section style={{ padding: '3rem 0', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="container-pad" style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap' }}>
          {[
            { icon: <Shield size={20} color="#818cf8" />, text: 'No credit card required for Free' },
            { icon: <Zap size={20} color="#34d399" />, text: '14-day money-back guarantee' },
            { icon: <Star size={20} color="#fbbf24" />, text: 'Cancel Pro anytime, no fees' },
          ].map(t => (
            <div key={t.text} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {t.icon}
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{t.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '5rem 0' }}>
        <div className="container-pad">
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, textAlign: 'center', marginBottom: '3rem', letterSpacing: '-0.02em' }}>
            Frequently Asked Questions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: '1.25rem', maxWidth: 920, margin: '0 auto' }}>
            {faqs.map(f => (
              <div key={f.q} className="glass-card" style={{ padding: '1.5rem' }}>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{f.q}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
