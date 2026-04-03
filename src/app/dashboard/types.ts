// ── Dashboard shared types ──

export type CwvMetric = { value: string; score: number; numericValue?: number }
export type FieldDataMetric = { p75: number; category: string } | null
export type Severity = 'critical' | 'moderate' | 'minor' | 'info'

export type AuditFinding = {
  id: string
  title: string
  description: string
  severity: Severity
  value?: string
  element?: string
}

export type CategoryResult = {
  category: string
  label: string
  score: number
  passed: number
  failed: number
  findings: AuditFinding[]
}

export type CustomAudit = {
  url: string
  fetchedAt: string
  duration: number
  overallScore: number
  categories: CategoryResult[]
  totalFindings: number
  critical: number
  moderate: number
  minor: number
}

export type AuditResult = {
  url: string
  strategy: string
  fetchedAt: string
  lighthouseVersion?: string
  scores: {
    performance: number
    accessibility: number
    bestPractices: number
    seo: number
  }
  cwv: {
    lcp: CwvMetric; inp: CwvMetric; cls: CwvMetric
    fcp: CwvMetric; ttfb: CwvMetric; si: CwvMetric; tbt: CwvMetric
  }
  fieldData: {
    lcp: FieldDataMetric; inp: FieldDataMetric; cls: FieldDataMetric; fid: FieldDataMetric
    overallCategory: string
  } | null
  opportunities: {
    id: string; title: string; description: string
    score: number; displayValue: string; impact: string
  }[]
  diagnostics: {
    id: string; title: string; displayValue: string; score: number | null
  }[]
  customAudit?: CustomAudit
  healthScore?: number
  fromCache?: boolean
}
