export default function ChecklistLoading() {
  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header skeleton */}
      <section style={{ padding: '5rem 0 3rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container-pad">
          <div className="skeleton" style={{ width: 120, height: 26, borderRadius: 100, marginBottom: '1rem' }} />
          <div className="skeleton" style={{ width: '55%', maxWidth: 320, height: 36, marginBottom: '0.75rem' }} />
          <div className="skeleton" style={{ width: '75%', maxWidth: 460, height: 18 }} />
        </div>
      </section>

      <div className="container-pad" style={{ padding: '2.5rem 1.5rem' }}>
        <div className="checklist-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2.5rem', alignItems: 'start' }}>
          {/* Checklist items skeleton */}
          <div>
            {/* Filter buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
              {[45, 40, 40, 40, 65].map((w, i) => (
                <div key={i} className="skeleton" style={{ width: w, height: 32, borderRadius: 100 }} />
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                <div className="skeleton" style={{ width: 70, height: 32, borderRadius: 100 }} />
                <div className="skeleton" style={{ width: 75, height: 32, borderRadius: 100 }} />
              </div>
            </div>

            {/* Checklist items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.9rem',
                  padding: '0.9rem 1.1rem', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                }}>
                  <div className="skeleton" style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0 }} />
                  <div className="skeleton" style={{ flex: 1, height: 16 }} />
                  <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                    <div className="skeleton" style={{ width: 38, height: 22, borderRadius: 5 }} />
                    <div className="skeleton" style={{ width: 45, height: 22, borderRadius: 5 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Score tracker skeleton */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div className="glass-card" style={{ padding: '2rem', minWidth: 200, textAlign: 'center' }}>
              <div className="skeleton" style={{ width: 80, height: 14, margin: '0 auto 1.25rem', borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 110, height: 110, borderRadius: '50%', margin: '0 auto 1rem' }} />
              <div className="skeleton" style={{ width: 100, height: 16, margin: '0 auto 1.5rem' }} />
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div className="skeleton" style={{ width: 70, height: 14 }} />
                  <div className="skeleton" style={{ width: 50, height: 14 }} />
                </div>
              ))}
              <div className="skeleton" style={{ width: '100%', height: 36, borderRadius: 8, marginTop: '1rem' }} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .checklist-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
