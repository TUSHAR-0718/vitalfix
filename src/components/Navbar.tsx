'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Zap, Menu, X } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

const links = [
  { href: '/', label: 'Home' },
  { href: '/library', label: 'Code Library' },
  { href: '/checklist', label: 'Audit Checklist' },
  { href: '/tools', label: 'Tools' },
  { href: '/pricing', label: 'Pricing' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(10,10,15,0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div className="container-pad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #7c6bff, #38bdf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={18} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            VitalFix
          </span>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="desktop-nav">
          {links.map(l => (
            <Link key={l.href} href={l.href} style={{
              padding: '0.4rem 0.85rem', borderRadius: 8, textDecoration: 'none',
              fontSize: '0.875rem', fontWeight: 500,
              color: pathname === l.href ? 'var(--accent)' : 'var(--text-secondary)',
              background: pathname === l.href ? 'var(--accent-glow)' : 'transparent',
              transition: 'all 0.2s',
            }}>
              {l.label}
            </Link>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ThemeToggle />
          <Link href="/pricing" className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}>
            Get Pro
          </Link>
          <button
            onClick={() => setOpen(!open)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'none' }}
            className="mobile-menu-btn"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg)' }}>
          <div className="container-pad" style={{ paddingTop: '1rem', paddingBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {links.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={{
                padding: '0.6rem 0.85rem', borderRadius: 8, textDecoration: 'none',
                fontSize: '0.9rem', fontWeight: 500,
                color: pathname === l.href ? 'var(--accent)' : 'var(--text-secondary)',
                background: pathname === l.href ? 'var(--accent-glow)' : 'transparent',
              }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </nav>
  )
}
