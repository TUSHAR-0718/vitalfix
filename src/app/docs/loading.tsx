export default function DocsLoading() {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header skeleton */}
      <section style={{ padding: '5rem 0 3rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container-pad">
          <div className="skeleton" style={{ width: 100, height: 26, borderRadius: 100, marginBottom: '1rem' }} />
          <div className="skeleton" style={{ width: '50%', maxWidth: 300, height: 36, marginBottom: '0.75rem' }} />
          <div className="skeleton" style={{ width: '70%', maxWidth: 480, height: 18 }} />
        </div>
      </section>

      <div className="container-pad" style={{ padding: '3rem 1.5rem' }}>
        {/* Quick jump buttons skeleton */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
          {[90, 85, 85].map((w, i) => (
            <div key={i} className="skeleton" style={{ width: w, height: 42, borderRadius: 10 }} />
          ))}
        </div>

        {/* Guide accordion skeletons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card" style={{ overflow: 'hidden' }}>
              {/* Accordion header */}
              <div style={{
                padding: '1.5rem 2rem', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 10 }} />
                  <div>
                    <div className="skeleton" style={{ width: 200 + i * 20, height: 20, marginBottom: '0.35rem' }} />
                    <div className="skeleton" style={{ width: 260 + i * 10, height: 14 }} />
                  </div>
                </div>
                <div className="skeleton" style={{ width: 18, height: 18, borderRadius: 4 }} />
              </div>

              {/* Expanded content (first item only) */}
              {i === 1 && (
                <div style={{ padding: '0 2rem 2rem' }}>
                  {/* Threshold */}
                  <div className="skeleton" style={{ width: '100%', height: 38, borderRadius: 8, marginBottom: '1.75rem' }} />
                  {/* Causes & Fixes columns */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div>
                      <div className="skeleton" style={{ width: 130, height: 18, marginBottom: '0.75rem' }} />
                      {[1, 2, 3, 4, 5].map(j => (
                        <div key={j} className="skeleton" style={{ width: `${85 - j * 5}%`, height: 16, marginBottom: '0.5rem' }} />
                      ))}
                    </div>
                    <div>
                      <div className="skeleton" style={{ width: 100, height: 18, marginBottom: '0.75rem' }} />
                      {[1, 2, 3, 4, 5].map(j => (
                        <div key={j} className="skeleton" style={{ width: `${90 - j * 6}%`, height: 16, marginBottom: '0.5rem' }} />
                      ))}
                    </div>
                  </div>
                  {/* Code block placeholder */}
                  <div className="skeleton" style={{ width: '100%', height: 200, borderRadius: 10 }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tools section skeleton */}
        <div style={{ marginTop: '4rem' }}>
          <div className="skeleton" style={{ width: 200, height: 28, marginBottom: '1.5rem' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div className="skeleton" style={{ width: 14, height: 14, borderRadius: 3 }} />
                  <div className="skeleton" style={{ width: 120, height: 16 }} />
                </div>
                <div className="skeleton" style={{ width: '85%', height: 14 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
