export default function LibraryLoading() {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header skeleton */}
      <section style={{ padding: '5rem 0 3rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container-pad">
          <div className="skeleton" style={{ width: 110, height: 26, borderRadius: 100, marginBottom: '1rem' }} />
          <div className="skeleton" style={{ width: '60%', maxWidth: 340, height: 36, marginBottom: '0.75rem' }} />
          <div className="skeleton" style={{ width: '80%', maxWidth: 440, height: 18 }} />
        </div>
      </section>

      {/* Filter bar skeleton */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg)', position: 'sticky', top: 64, zIndex: 50 }}>
        <div className="container-pad" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.5rem' }}>
          <div className="skeleton" style={{ width: 15, height: 15, borderRadius: 4 }} />
          {[70, 50, 50, 40, 80, 65, 60].map((w, i) => (
            <div key={i} className="skeleton" style={{ width: w, height: 30, borderRadius: 100 }} />
          ))}
          <div style={{ marginLeft: 'auto' }}>
            <div className="skeleton" style={{ width: 80, height: 18 }} />
          </div>
        </div>
      </div>

      {/* Snippet cards skeleton */}
      <div className="container-pad" style={{ padding: '2.5rem 1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="glass-card" style={{ padding: '2rem' }}>
              {/* Category badge + title */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <div className="skeleton" style={{ width: 55, height: 22, borderRadius: 5, marginBottom: '0.6rem' }} />
                  <div className="skeleton" style={{ width: 240 + (i % 3) * 40, height: 22 }} />
                </div>
                <div className="skeleton" style={{ width: 18, height: 18, borderRadius: 4 }} />
              </div>
              {/* Description */}
              <div className="skeleton" style={{ width: '90%', height: 16, marginBottom: '0.5rem' }} />
              <div className="skeleton" style={{ width: '70%', height: 16, marginBottom: '1.25rem' }} />
              {/* Code block */}
              <div className="skeleton" style={{ width: '100%', height: 160, borderRadius: 10 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
