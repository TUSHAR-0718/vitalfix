'use client'
import { useState } from 'react'
import CodeBlock from '@/components/CodeBlock'
import { Code2, Filter } from 'lucide-react'

const snippets = [
  {
    id: 'lcp-preload',
    category: 'LCP',
    title: 'Preload Above-the-Fold Images',
    desc: 'Preloading your hero/LCP image drastically reduces discovery time, typically improving LCP by 500ms–1.5s.',
    language: 'html',
    filename: 'index.html',
    code: `<!-- Add in <head> before any stylesheets -->
<link rel="preload"
  as="image"
  href="/hero-image.webp"
  fetchpriority="high"
  imagesrcset="/hero-480.webp 480w, /hero-800.webp 800w, /hero-1200.webp 1200w"
  imagesizes="(max-width: 600px) 480px, (max-width: 1000px) 800px, 1200px"
/>

<!-- The image tag itself -->
<img
  src="/hero-image.webp"
  alt="Hero"
  width="1200"
  height="600"
  fetchpriority="high"
  decoding="async"
/>`,
  },
  {
    id: 'lcp-server-timing',
    category: 'LCP',
    title: 'Reduce Server Response Time (TTFB)',
    desc: 'Use HTTP caching headers and Edge delivery to reduce time to first byte, which feeds directly into LCP.',
    language: 'javascript',
    filename: 'next.config.js',
    code: `// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Aggressive cache for static assets
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/',
        headers: [
          // Stale-while-revalidate for HTML
          {
            key: 'Cache-Control',
            value: 's-maxage=60, stale-while-revalidate=600',
          },
        ],
      },
    ]
  },
}`,
  },
  {
    id: 'cls-image-size',
    category: 'CLS',
    title: 'Always Set Image Width & Height',
    desc: 'The browser reserves space before images load, preventing layout shifts. Use aspect-ratio as the modern CSS approach.',
    language: 'css',
    filename: 'styles.css',
    code: `/* Modern CSS approach — set aspect ratio on containers */
.image-container {
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Or use width/height attributes directly on <img> */
/* <img src="photo.jpg" width="800" height="450" alt="..."> */

/* For dynamic iframes or embeds */
.embed-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 */
  height: 0;
}

.embed-container iframe {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
}`,
  },
  {
    id: 'cls-font-fallback',
    category: 'CLS',
    title: 'Prevent Font-Swap Layout Shifts',
    desc: 'Use the size-adjust and ascent-override CSS descriptors to make fallback fonts match your web font dimensions.',
    language: 'css',
    filename: 'fonts.css',
    code: `/* Define a size-adjusted fallback to match your custom font */
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
  size-adjust: 107%;
}

/* Use the fallback in your font stack */
body {
  font-family: 'Inter', 'Inter Fallback', system-ui, sans-serif;
}

/* In Next.js — use the built-in font optimizer */
/* import { Inter } from 'next/font/google'
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',      // 'optional' for zero CLS
  preload: true,
})  */`,
  },
  {
    id: 'inp-debounce',
    category: 'INP',
    title: 'Debounce Expensive Event Handlers',
    desc: 'Long event handlers block the main thread and hurt INP. Debounce + schedule non-critical work with scheduler.postTask.',
    language: 'javascript',
    filename: 'utils.js',
    code: `// Debounce utility
function debounce(fn, wait = 200) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}

// Throttle utility (for scroll/resize)
function throttle(fn, limit = 100) {
  let inThrottle
  return (...args) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Schedule non-urgent work away from user interaction
function scheduleIdleWork(callback) {
  if ('scheduler' in window && 'postTask' in scheduler) {
    return scheduler.postTask(callback, { priority: 'background' })
  }
  // Fallback
  return new Promise(resolve => {
    requestIdleCallback(() => resolve(callback()))
  })
}

// Usage
const input = document.querySelector('#search')
input.addEventListener('input', debounce(async (e) => {
  const results = await fetchSearchResults(e.target.value)
  scheduleIdleWork(() => renderResults(results))
}, 250))`,
  },
  {
    id: 'inp-long-tasks',
    category: 'INP',
    title: 'Break Up Long Tasks with yield()',
    desc: 'Long JavaScript tasks (>50ms) block user interaction. Yield to the browser periodically to keep INP under 200ms.',
    language: 'javascript',
    filename: 'tasks.js',
    code: `// Yield to main thread between work chunks
function yieldToMain() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// Process a large array in chunks
async function processLargeArray(items) {
  const CHUNK_SIZE = 50
  const results = []

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE)

    // Process chunk synchronously
    for (const item of chunk) {
      results.push(expensiveOperation(item))
    }

    // Yield to browser after each chunk
    // This allows interaction events to be processed
    if (i + CHUNK_SIZE < items.length) {
      await yieldToMain()
    }
  }

  return results
}

// Modern scheduler API (Chrome 115+)
async function processWithScheduler(items) {
  for (const item of items) {
    await scheduler.yield()  // Yields if a user interaction is pending
    processItem(item)
  }
}`,
  },
  {
    id: 'lazy-loading',
    category: 'Lazy Loading',
    title: 'Native Lazy Loading + Intersection Observer',
    desc: 'Defer off-screen images and components using the native loading="lazy" attribute combined with Intersection Observer for JS-heavy components.',
    language: 'javascript',
    filename: 'lazyLoad.js',
    code: `// 1. Native lazy loading (browser support: 92%+)
// <img src="photo.jpg" loading="lazy" alt="..." width="800" height="600">

// 2. Intersection Observer for JS components
function lazyLoadComponent(selector, importFn) {
  const elements = document.querySelectorAll(selector)
  if (!elements.length) return

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        const module = await importFn()
        module.init(entry.target)
        observer.unobserve(entry.target)
      }
    })
  }, {
    rootMargin: '200px',  // Start loading 200px before visible
    threshold: 0,
  })

  elements.forEach(el => observer.observe(el))
}

// Usage
lazyLoadComponent('[data-map]', () => import('./map.js'))
lazyLoadComponent('[data-chart]', () => import('./chart.js'))

// 3. React lazy + Suspense
// const HeavyChart = React.lazy(() => import('./HeavyChart'))
// <Suspense fallback={<Skeleton />}><HeavyChart /></Suspense>`,
  },
  {
    id: 'cls-dynamic-content',
    category: 'CLS',
    title: 'Reserve Space for Dynamic Content',
    desc: 'Ads, banners, and late-loading content cause massive CLS. Always reserve space with min-height or skeleton placeholders.',
    language: 'css',
    filename: 'layout.css',
    code: `/* Reserve space for ad slots */
.ad-slot {
  min-height: 250px;  /* Standard ad height */
  min-width: 300px;
  background: var(--skeleton-bg);
  border-radius: 4px;
  container-type: inline-size;
}

/* Skeleton loading state */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-card) 25%,
    var(--border) 50%,
    var(--bg-card) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-wave 1.5s infinite;
  border-radius: 4px;
}

@keyframes skeleton-wave {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Prevent banner/notification from pushing content */
.top-banner {
  height: 44px;           /* Fixed height — never auto */
  overflow: hidden;
  position: sticky;
  top: 0;
  z-index: 50;
}`,
  },
]

const categories = ['All', 'LCP', 'CLS', 'INP', 'Lazy Loading']

export default function LibraryPage() {
  const [active, setActive] = useState('All')

  const filtered = active === 'All' ? snippets : snippets.filter(s => s.category === active)

  const catColor: Record<string, string> = {
    LCP: '#38bdf8', CLS: '#f7971e', INP: '#43e97b', 'Lazy Loading': '#7c6bff'
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <section style={{ padding: '5rem 0 3rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container-pad">
          <span className="badge badge-accent" style={{ marginBottom: '1rem' }}>Code Library</span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
            Production-Ready <span className="gradient-text">Code Snippets</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: 540, lineHeight: 1.7 }}>
            Copy-paste solutions for every Core Web Vital issue. Each snippet is tested and ready to ship.
          </p>
        </div>
      </section>

      {/* Filters */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg)', position: 'sticky', top: 64, zIndex: 50 }}>
        <div className="container-pad" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.5rem', overflowX: 'auto' }}>
          <Filter size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setActive(c)}
              style={{
                padding: '0.35rem 0.9rem', borderRadius: 100, border: 'none',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                background: active === c
                  ? (c === 'All' ? 'var(--accent)' : `${catColor[c]}22`)
                  : 'var(--bg-card)',
                color: active === c
                  ? (c === 'All' ? '#fff' : catColor[c])
                  : 'var(--text-secondary)',
                border: active === c && c !== 'All'
                  ? `1px solid ${catColor[c]}44`
                  : '1px solid var(--border)',
                transition: 'all 0.2s',
              }}
            >
              {c}
            </button>
          ))}
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}>
            {filtered.length} snippet{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Snippets */}
      <div className="container-pad" style={{ padding: '2.5rem 1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {filtered.map(s => (
            <div key={s.id} id={s.id} className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem',
                    borderRadius: 5, marginBottom: '0.5rem', display: 'inline-block',
                    background: `${catColor[s.category] || '#7c6bff'}18`,
                    color: catColor[s.category] || '#7c6bff',
                    border: `1px solid ${catColor[s.category] || '#7c6bff'}33`,
                  }}>
                    {s.category}
                  </span>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.title}</h2>
                </div>
                <Code2 size={18} color="var(--text-muted)" />
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1.25rem' }}>{s.desc}</p>
              <CodeBlock code={s.code} language={s.language} filename={s.filename} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
