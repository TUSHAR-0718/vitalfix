'use client'
import { useState } from 'react'
import { Gauge, Info } from 'lucide-react'

// LCP simulator
function LCPTool() {
  const [ttfb, setTtfb] = useState(400)
  const [renderDelay, setRenderDelay] = useState(300)
  const [resourceLoad, setResourceLoad] = useState(800)
  const [elementRender, setElementRender] = useState(200)

  const lcp = ttfb + renderDelay + resourceLoad + elementRender
  const score = lcp <= 2500 ? 'Good' : lcp <= 4000 ? 'Needs Improvement' : 'Poor'
  const scoreColor = lcp <= 2500 ? '#43e97b' : lcp <= 4000 ? '#f7971e' : '#ff6b6b'
  const pct = Math.min(100, (lcp / 6000) * 100)

  const sliders = [
    { label: 'Time to First Byte (TTFB)', value: ttfb, set: setTtfb, min: 50, max: 2000, tip: 'Server response time. Target < 600ms.' },
    { label: 'Resource Load Time', value: resourceLoad, set: setResourceLoad, min: 50, max: 3000, tip: 'Time to transfer the LCP image from server to browser.' },
    { label: 'Render Delay', value: renderDelay, set: setRenderDelay, min: 0, max: 1000, tip: 'JS/CSS blocking paint to start. Minimise render-blocking resources.' },
    { label: 'Element Render Time', value: elementRender, set: setElementRender, min: 0, max: 500, tip: 'Browser processing time to paint the element.' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: 'clamp(2.5rem,6vw,3.5rem)', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
            {(lcp / 1000).toFixed(2)}s
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Largest Contentful Paint</div>
        </div>
        <div style={{
          padding: '0.6rem 1.2rem', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem',
          background: `${scoreColor}18`, color: scoreColor, border: `1px solid ${scoreColor}35`,
        }}>
          {score}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', marginBottom: '2rem', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4,
          width: `${pct}%`,
          background: `linear-gradient(90deg, #43e97b, ${scoreColor})`,
          transition: 'width 0.3s ease, background 0.3s ease',
        }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {sliders.map(s => (
          <div key={s.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.label}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700, fontFamily: 'monospace' }}>{s.value}ms</span>
            </div>
            <input
              type="range" min={s.min} max={s.max} value={s.value}
              onChange={e => s.set(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{s.tip}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 10, background: 'var(--accent-glow)', border: '1px solid rgba(124,107,255,0.2)' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--accent)' }}>LCP Breakdown:</strong> TTFB {ttfb}ms + Render Delay {renderDelay}ms + Resource Load {resourceLoad}ms + Element Render {elementRender}ms = <strong style={{ color: scoreColor }}>{lcp}ms</strong>
        </p>
      </div>
    </div>
  )
}

// CLS simulator  
function CLSTool() {
  const [shiftCount, setShiftCount] = useState(2)
  const [avgShiftSize, setAvgShiftSize] = useState(0.08)
  const [viewport, setViewport] = useState(60)

  const cls = (shiftCount * avgShiftSize * (viewport / 100)).toFixed(4)
  const clsNum = parseFloat(cls)
  const score = clsNum <= 0.1 ? 'Good' : clsNum <= 0.25 ? 'Needs Improvement' : 'Poor'
  const scoreColor = clsNum <= 0.1 ? '#43e97b' : clsNum <= 0.25 ? '#f7971e' : '#ff6b6b'
  const pct = Math.min(100, (clsNum / 0.5) * 100)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: 'clamp(2.5rem,6vw,3.5rem)', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
            {cls}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Cumulative Layout Shift</div>
        </div>
        <div style={{ padding: '0.6rem 1.2rem', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', background: `${scoreColor}18`, color: scoreColor, border: `1px solid ${scoreColor}35` }}>
          {score}
        </div>
      </div>

      <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', marginBottom: '2rem', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: `linear-gradient(90deg, #43e97b, ${scoreColor})`, transition: 'width 0.3s ease' }} />
      </div>

      {[
        { label: 'Number of Layout Shifts', value: shiftCount, set: setShiftCount, min: 0, max: 20, step: 1, display: shiftCount.toString(), tip: 'Total shifts during page load lifecycle.' },
        { label: 'Average Shift Size (impact fraction)', value: avgShiftSize, set: setAvgShiftSize, min: 0.01, max: 0.5, step: 0.01, display: avgShiftSize.toFixed(2), tip: 'Fraction of viewport affected per shift.' },
        { label: 'Viewport Impact %', value: viewport, set: setViewport, min: 10, max: 100, step: 5, display: `${viewport}%`, tip: 'What portion of the viewport is affected by shifts.' },
      ].map(s => (
        <div key={s.label} style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.label}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700, fontFamily: 'monospace' }}>{s.display}</span>
          </div>
          <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
            onChange={e => s.set(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#f7971e' }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{s.tip}</p>
        </div>
      ))}
    </div>
  )
}

// INP simulator
function INPTool() {
  const [inputDelay, setInputDelay] = useState(30)
  const [processingTime, setProcessingTime] = useState(120)
  const [presentationDelay, setPresentationDelay] = useState(40)

  const inp = inputDelay + processingTime + presentationDelay
  const score = inp <= 200 ? 'Good' : inp <= 500 ? 'Needs Improvement' : 'Poor'
  const scoreColor = inp <= 200 ? '#43e97b' : inp <= 500 ? '#f7971e' : '#ff6b6b'
  const pct = Math.min(100, (inp / 1000) * 100)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: 'clamp(2.5rem,6vw,3.5rem)', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
            {inp}ms
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Interaction to Next Paint</div>
        </div>
        <div style={{ padding: '0.6rem 1.2rem', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', background: `${scoreColor}18`, color: scoreColor, border: `1px solid ${scoreColor}35` }}>
          {score}
        </div>
      </div>

      <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', marginBottom: '2rem', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: `linear-gradient(90deg, #43e97b, ${scoreColor})`, transition: 'width 0.3s ease' }} />
      </div>

      {[
        { label: 'Input Delay', value: inputDelay, set: setInputDelay, min: 0, max: 300, tip: 'Time from user action to event handler start. Reduce with fewer scheduled tasks.' },
        { label: 'Processing Time', value: processingTime, set: setProcessingTime, min: 0, max: 600, tip: 'Event handler execution time. Break up long tasks with yield().' },
        { label: 'Presentation Delay', value: presentationDelay, set: setPresentationDelay, min: 0, max: 200, tip: 'Time from handler to next frame paint. Reduce style recalculations.' },
      ].map(s => (
        <div key={s.label} style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.label}</span>
            <span style={{ fontSize: '0.85rem', color: '#43e97b', fontWeight: 700, fontFamily: 'monospace' }}>{s.value}ms</span>
          </div>
          <input type="range" min={s.min} max={s.max} value={s.value}
            onChange={e => s.set(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#43e97b' }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{s.tip}</p>
        </div>
      ))}

      <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 10, background: 'rgba(67,233,123,0.06)', border: '1px solid rgba(67,233,123,0.2)' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: '#43e97b' }}>Formula:</strong> INP = Input Delay ({inputDelay}ms) + Processing ({processingTime}ms) + Presentation ({presentationDelay}ms) = <strong style={{ color: scoreColor }}>{inp}ms</strong>
        </p>
      </div>
    </div>
  )
}

const tools = [
  { id: 'lcp', label: 'LCP Simulator', color: '#38bdf8', component: LCPTool, desc: 'Understand what contributes to your Largest Contentful Paint score.' },
  { id: 'cls', label: 'CLS Calculator', color: '#f7971e', component: CLSTool, desc: 'See how layout shifts compound to affect your CLS score.' },
  { id: 'inp', label: 'INP Breakdown', color: '#43e97b', component: INPTool, desc: 'Decompose your Interaction to Next Paint into its three phases.' },
]

export default function ToolsPage() {
  const [active, setActive] = useState('lcp')
  const tool = tools.find(t => t.id === active)!
  const ActiveComponent = tool.component

  return (
    <div style={{ minHeight: '100vh' }}>
      <section style={{ padding: '5rem 0 3rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container-pad">
          <span className="badge badge-blue" style={{ marginBottom: '1rem' }}>Interactive Tools</span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
            Understand Your <span className="gradient-text">Web Vitals Scores</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: 540, lineHeight: 1.7 }}>
            Adjust sliders to see in real time how different factors affect your Core Web Vitals score.
          </p>
        </div>
      </section>

      <div className="container-pad" style={{ padding: '2.5rem 1.5rem' }}>
        {/* Tab selector */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {tools.map(t => (
            <button key={t.id} onClick={() => setActive(t.id)} style={{
              padding: '0.6rem 1.25rem', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
              transition: 'all 0.2s',
              background: active === t.id ? `${t.color}20` : 'var(--bg-card)',
              color: active === t.id ? t.color : 'var(--text-secondary)',
              border: active === t.id ? `1px solid ${t.color}44` : '1px solid var(--border)',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: '2rem', alignItems: 'start' }}>
          {/* Tool panel */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <ActiveComponent />
          </div>

          {/* Info panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-card" style={{ padding: '1.75rem', borderColor: `${tool.color}33` }}>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <Info size={16} color={tool.color} />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: tool.color }}>About {tool.label}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{tool.desc}</p>
            </div>

            {/* Thresholds */}
            <div className="glass-card" style={{ padding: '1.75rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '1rem' }}>Score Thresholds</p>
              {[
                { label: 'Good', color: '#43e97b', range: tool.id === 'lcp' ? '≤ 2.5s' : tool.id === 'cls' ? '≤ 0.1' : '≤ 200ms' },
                { label: 'Needs Work', color: '#f7971e', range: tool.id === 'lcp' ? '2.5–4.0s' : tool.id === 'cls' ? '0.1–0.25' : '200–500ms' },
                { label: 'Poor', color: '#ff6b6b', range: tool.id === 'lcp' ? '> 4.0s' : tool.id === 'cls' ? '> 0.25' : '> 500ms' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: s.color }}>{s.label}</span>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{s.range}</span>
                </div>
              ))}
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(124,107,255,0.05)', borderColor: 'rgba(124,107,255,0.2)' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                💡 <strong style={{ color: 'var(--accent)' }}>Tip:</strong> Google requires <strong>Good</strong> ratings on all three metrics for your page to pass Core Web Vitals assessment in Search Console.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
