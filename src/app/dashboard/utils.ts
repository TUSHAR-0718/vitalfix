// ── Dashboard helper functions ──

import type { LucideIcon } from 'lucide-react'
import {
  Link2, Image, Code, Type, FileText,
  ShieldCheck, Smartphone, Accessibility, Shield,
} from 'lucide-react'

export const scoreColor = (s: number) =>
  s >= 90 ? '#34d399' : s >= 50 ? '#fbbf24' : '#f87171'

export const scoreLabel = (s: number) =>
  s >= 90 ? 'Good' : s >= 50 ? 'Needs Improvement' : 'Poor'

export const fieldCatColor = (cat: string) => {
  if (cat === 'FAST') return '#34d399'
  if (cat === 'AVERAGE') return '#fbbf24'
  return '#f87171'
}

export const impactColor: Record<string, string> = {
  high: '#f87171', medium: '#fbbf24', low: '#34d399',
}

export const severityColor: Record<string, string> = {
  critical: '#f87171', moderate: '#fbbf24', minor: '#60a5fa', info: 'var(--text-muted)',
}

export const categoryIcon: Record<string, LucideIcon> = {
  'broken-links': Link2, images: Image, assets: Code, 'meta-tags': FileText,
  headings: Type, security: ShieldCheck, mobile: Smartphone, accessibility: Accessibility,
}

export const defaultCategoryIcon = Shield

// ── Static display data ──

export const waterfallItems = [
  { label: 'Document (HTML)', type: 'html',  color: '#818cf8', offset: 0,   width: 12 },
  { label: 'main.css',        type: 'css',   color: '#60a5fa', offset: 10,  width: 8 },
  { label: 'runtime.js',      type: 'js',    color: '#fbbf24', offset: 12,  width: 18 },
  { label: 'hero-image.webp', type: 'img',   color: '#34d399', offset: 14,  width: 22 },
  { label: 'Inter font',      type: 'font',  color: '#a78bfa', offset: 16,  width: 14 },
  { label: 'app.chunk.js',    type: 'js',    color: '#fbbf24', offset: 22,  width: 30 },
  { label: 'analytics.js',    type: 'js',    color: '#fbbf24', offset: 30,  width: 20 },
  { label: '/api/data',       type: 'xhr',   color: '#f87171', offset: 35,  width: 25 },
  { label: 'lazy-component',  type: 'js',    color: '#fbbf24', offset: 50,  width: 18 },
  { label: 'thumbnail.webp',  type: 'img',   color: '#34d399', offset: 55,  width: 12 },
]

export const typeColors: Record<string, string> = {
  html: '#818cf8', css: '#60a5fa', js: '#fbbf24', img: '#34d399', font: '#a78bfa', xhr: '#f87171',
}

export const filmStrip = [
  { label: '0.0s', fill: 5 }, { label: '0.5s', fill: 22 },
  { label: '1.0s', fill: 48 }, { label: '1.5s', fill: 71 },
  { label: '2.0s', fill: 88 }, { label: '2.5s', fill: 100 },
]
