#!/usr/bin/env node
// ── VitalFix Health Check Script ──
// Tests connectivity to all three external services:
//   1. Sentry (Error Monitoring)
//   2. Supabase (Backend / Auth / DB)
//   3. Google Cloud / PageSpeed Insights (PSI API)

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')

// Parse .env.local
function loadEnv() {
  try {
    const content = readFileSync(envPath, 'utf-8')
    const env = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      env[key] = val
    }
    return env
  } catch (e) {
    console.error('❌ Could not read .env.local:', e.message)
    process.exit(1)
  }
}

const env = loadEnv()

const PASS = '✅'
const FAIL = '❌'
const WARN = '⚠️'
const INFO = 'ℹ️'

let totalChecks = 0
let passedChecks = 0
let failedChecks = 0
let warnChecks = 0

function check(status, label, detail = '') {
  totalChecks++
  if (status === 'pass') {
    passedChecks++
    console.log(`  ${PASS} ${label}${detail ? ' — ' + detail : ''}`)
  } else if (status === 'fail') {
    failedChecks++
    console.log(`  ${FAIL} ${label}${detail ? ' — ' + detail : ''}`)
  } else {
    warnChecks++
    console.log(`  ${WARN} ${label}${detail ? ' — ' + detail : ''}`)
  }
}

function info(label) {
  console.log(`  ${INFO} ${label}`)
}

// ═══════════════════════════════════════════════
// 1. SENTRY
// ═══════════════════════════════════════════════

async function checkSentry() {
  console.log('\n' + '═'.repeat(55))
  console.log('  🔴 SENTRY — Error Monitoring & Tracing')
  console.log('═'.repeat(55))

  // 1a. Check env vars
  const publicDsn = env.NEXT_PUBLIC_SENTRY_DSN
  const serverDsn = env.SENTRY_DSN
  const org = env.SENTRY_ORG
  const project = env.SENTRY_PROJECT
  const authToken = env.SENTRY_AUTH_TOKEN

  if (!publicDsn) {
    check('fail', 'NEXT_PUBLIC_SENTRY_DSN', 'Not set in .env.local')
    return
  }
  check('pass', 'NEXT_PUBLIC_SENTRY_DSN', `Set → ${publicDsn.slice(0, 40)}…`)

  if (!serverDsn) {
    check('fail', 'SENTRY_DSN (server)', 'Not set')
  } else if (serverDsn === publicDsn) {
    check('pass', 'SENTRY_DSN (server)', 'Matches public DSN ✓')
  } else {
    check('warn', 'SENTRY_DSN (server)', 'Differs from NEXT_PUBLIC_SENTRY_DSN — verify this is intended')
  }

  if (org && org !== 'your_sentry_org') {
    check('pass', 'SENTRY_ORG', org)
  } else {
    check('fail', 'SENTRY_ORG', 'Not configured (still placeholder)')
  }

  if (project && project !== 'your_sentry_project') {
    check('pass', 'SENTRY_PROJECT', project)
  } else {
    check('fail', 'SENTRY_PROJECT', 'Not configured (still placeholder)')
  }

  if (authToken && !authToken.startsWith('sntrys_')) {
    check('warn', 'SENTRY_AUTH_TOKEN', 'Set but doesn\'t start with sntrys_ — may not be a valid auth token')
  } else if (authToken) {
    check('pass', 'SENTRY_AUTH_TOKEN', 'Set ✓ (source maps upload enabled)')
  } else {
    check('warn', 'SENTRY_AUTH_TOKEN', 'Not set — source maps will NOT be uploaded on build')
  }

  // 1b. Validate DSN format
  try {
    const dsnUrl = new URL(publicDsn)
    const host = dsnUrl.hostname
    if (!host.includes('sentry.io') && !host.includes('ingest')) {
      check('warn', 'DSN Host', `Unusual host: ${host} — expected *.sentry.io`)
    } else {
      check('pass', 'DSN Format', `Valid DSN pointing to ${host}`)
    }
  } catch {
    check('fail', 'DSN Format', 'Invalid URL — cannot parse DSN')
    return
  }

  // 1c. Connectivity test — POST a test envelope to Sentry
  try {
    const dsnUrl = new URL(publicDsn)
    const projectId = dsnUrl.pathname.replace(/\//g, '')
    const publicKey = dsnUrl.username
    const host = dsnUrl.hostname

    // Sentry envelope endpoint
    const envelopeUrl = `https://${host}/api/${projectId}/envelope/?sentry_key=${publicKey}&sentry_version=7`

    // Minimal envelope: just a header (no actual event)
    const envelopeHeader = JSON.stringify({
      event_id: crypto.randomUUID().replace(/-/g, ''),
      dsn: publicDsn,
      sdk: { name: 'sentry.javascript.healthcheck', version: '0.0.1' },
    })

    const res = await fetch(envelopeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: envelopeHeader + '\n',
      signal: AbortSignal.timeout(10000),
    })

    if (res.ok || res.status === 200) {
      check('pass', 'Sentry Ingest Endpoint', `Reachable (HTTP ${res.status})`)
    } else if (res.status === 403) {
      check('fail', 'Sentry Ingest Endpoint', `HTTP 403 — DSN key is invalid or project is disabled`)
    } else if (res.status === 429) {
      check('warn', 'Sentry Ingest Endpoint', `HTTP 429 — rate limited (but reachable)`)
    } else {
      check('warn', 'Sentry Ingest Endpoint', `Unexpected HTTP ${res.status}`)
    }
  } catch (e) {
    check('fail', 'Sentry Ingest Endpoint', `Connection failed: ${e.message}`)
  }

  // 1d. Check Sentry API (if auth token is available)
  if (authToken) {
    try {
      const res = await fetch(`https://sentry.io/api/0/organizations/${org}/`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) {
        const data = await res.json()
        check('pass', 'Sentry API (Org Access)', `Organization "${data.name || org}" accessible`)
      } else if (res.status === 401) {
        check('fail', 'Sentry API (Org Access)', 'Auth token is invalid or expired')
      } else {
        check('warn', 'Sentry API (Org Access)', `Unexpected HTTP ${res.status}`)
      }
    } catch (e) {
      check('warn', 'Sentry API (Org Access)', `Could not reach Sentry API: ${e.message}`)
    }
  }

  // 1e. Check config files exist
  const configFiles = [
    'sentry.server.config.ts',
    'sentry.edge.config.ts',
    'instrumentation.ts',
    'instrumentation-client.ts',
  ]
  for (const f of configFiles) {
    try {
      readFileSync(resolve(__dirname, '..', f))
      check('pass', `Config: ${f}`, 'Exists')
    } catch {
      check('fail', `Config: ${f}`, 'MISSING — Sentry will not initialize for this runtime')
    }
  }

  // 1f. Check next.config.js uses withSentryConfig
  try {
    const nextConfig = readFileSync(resolve(__dirname, '..', 'next.config.js'), 'utf-8')
    if (nextConfig.includes('withSentryConfig')) {
      check('pass', 'next.config.js', 'withSentryConfig wrapper present')
    } else {
      check('fail', 'next.config.js', 'withSentryConfig NOT found — Sentry plugin disabled')
    }
    if (nextConfig.includes('tunnelRoute')) {
      check('pass', 'Tunnel Route', '/monitoring proxy configured (bypasses ad-blockers)')
    } else {
      check('warn', 'Tunnel Route', 'Not configured — ad-blockers may block Sentry')
    }
  } catch {
    check('fail', 'next.config.js', 'File not found')
  }
}

// ═══════════════════════════════════════════════
// 2. SUPABASE
// ═══════════════════════════════════════════════

async function checkSupabase() {
  console.log('\n' + '═'.repeat(55))
  console.log('  🟢 SUPABASE — Backend / Auth / Database')
  console.log('═'.repeat(55))

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

  // 2a. Check env vars
  if (!url) {
    check('fail', 'NEXT_PUBLIC_SUPABASE_URL', 'Not set')
    return
  }
  check('pass', 'NEXT_PUBLIC_SUPABASE_URL', url)

  if (!anonKey) {
    check('fail', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Not set')
    return
  }
  check('pass', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', `Set (${anonKey.slice(0, 20)}…)`)

  if (serviceKey && serviceKey !== 'eyJ...') {
    check('pass', 'SUPABASE_SERVICE_ROLE_KEY', 'Set ✓ (server-side operations enabled)')
  } else {
    check('warn', 'SUPABASE_SERVICE_ROLE_KEY', 'Not set or placeholder — server-side admin operations will fail')
  }

  // 2b. Validate URL format
  try {
    const u = new URL(url)
    if (!u.hostname.includes('supabase')) {
      check('warn', 'URL Format', `Unusual host: ${u.hostname}`)
    } else {
      const projectRef = u.hostname.split('.')[0]
      check('pass', 'URL Format', `Project ref: ${projectRef}`)
    }
  } catch {
    check('fail', 'URL Format', 'Invalid URL')
    return
  }

  // 2c. Health check — test REST API via a real table query (bare /rest/v1/ always 401 with RLS)
  try {
    const res = await fetch(`${url}/rest/v1/profiles?select=count&limit=0`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      signal: AbortSignal.timeout(10000),
    })

    if (res.ok) {
      check('pass', 'REST API', `Reachable (HTTP ${res.status})`)
    } else if (res.status === 401) {
      check('fail', 'REST API', 'HTTP 401 — anon key is invalid')
    } else {
      check('warn', 'REST API', `HTTP ${res.status} — RLS may be blocking (API is reachable)`)
    }
  } catch (e) {
    check('fail', 'REST API', `Connection failed: ${e.message}`)
  }

  // 2d. Auth endpoint
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { 'apikey': anonKey },
      signal: AbortSignal.timeout(10000),
    })

    if (res.ok) {
      const settings = await res.json()
      check('pass', 'Auth Service', 'Running and accessible')
      if (settings.external) {
        const providers = Object.keys(settings.external).filter(k => settings.external[k])
        if (providers.length > 0) {
          info(`  Enabled providers: ${providers.join(', ')}`)
        }
      }
    } else {
      check('fail', 'Auth Service', `HTTP ${res.status}`)
    }
  } catch (e) {
    check('fail', 'Auth Service', `Connection failed: ${e.message}`)
  }

  // 2e. Check critical tables exist
  const tables = ['profiles', 'scans']
  for (const table of tables) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=count&limit=0`, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Prefer': 'count=exact',
        },
        signal: AbortSignal.timeout(10000),
      })

      if (res.ok) {
        const count = res.headers.get('content-range')
        check('pass', `Table: ${table}`, `Exists${count ? ` (${count})` : ''}`)
      } else if (res.status === 404) {
        check('fail', `Table: ${table}`, 'NOT FOUND — table does not exist. Run the schema migration.')
      } else if (res.status === 401 || res.status === 403) {
        check('warn', `Table: ${table}`, `HTTP ${res.status} — RLS may be blocking access (table likely exists)`)
      } else {
        check('warn', `Table: ${table}`, `HTTP ${res.status}`)
      }
    } catch (e) {
      check('fail', `Table: ${table}`, `Query failed: ${e.message}`)
    }
  }

  // 2f. Check optional tables (using correct DB table names)
  const optionalTables = ['analytics_events', 'analytics_daily', 'public_reports', 'leads', 'digests']
  for (const table of optionalTables) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=count&limit=0`, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Prefer': 'count=exact',
        },
        signal: AbortSignal.timeout(8000),
      })

      if (res.ok) {
        check('pass', `Table: ${table}`, 'Exists')
      } else if (res.status === 404) {
        check('warn', `Table: ${table} (optional)`, 'Not found — feature may not be active')
      } else {
        check('warn', `Table: ${table} (optional)`, `HTTP ${res.status}`)
      }
    } catch (e) {
      check('warn', `Table: ${table} (optional)`, `Query failed: ${e.message}`)
    }
  }

  // 2g. Realtime check
  try {
    const res = await fetch(`${url}/realtime/v1/`, {
      headers: { 'apikey': anonKey },
      signal: AbortSignal.timeout(10000),
    })
    // Realtime endpoint typically returns various status codes
    if (res.status < 500) {
      check('pass', 'Realtime Service', `Accessible (HTTP ${res.status})`)
    } else {
      check('warn', 'Realtime Service', `HTTP ${res.status}`)
    }
  } catch (e) {
    check('warn', 'Realtime Service', `Could not reach: ${e.message}`)
  }

  // 2h. Storage check
  try {
    const res = await fetch(`${url}/storage/v1/bucket`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
      signal: AbortSignal.timeout(10000),
    })
    if (res.ok) {
      const buckets = await res.json()
      check('pass', 'Storage Service', `Running (${Array.isArray(buckets) ? buckets.length : 0} bucket(s))`)
    } else if (res.status === 400 || res.status === 401) {
      check('warn', 'Storage Service', `HTTP ${res.status} — accessible but may need auth`)
    } else {
      check('warn', 'Storage Service', `HTTP ${res.status}`)
    }
  } catch (e) {
    check('warn', 'Storage Service', `Could not reach: ${e.message}`)
  }
}

// ═══════════════════════════════════════════════
// 3. GOOGLE CLOUD / PSI
// ═══════════════════════════════════════════════

async function checkGooglePSI() {
  console.log('\n' + '═'.repeat(55))
  console.log('  🔵 GOOGLE CLOUD — PageSpeed Insights API')
  console.log('═'.repeat(55))

  const poolRaw = env.PSI_API_KEYS_POOL
  const singleKey = env.GOOGLE_PSI_API_KEY

  // 3a. Check env vars
  if (poolRaw) {
    const keys = poolRaw.split(',').map(k => k.trim()).filter(k => k.length > 0)
    check('pass', 'PSI_API_KEYS_POOL', `${keys.length} key(s) configured`)

    // 3b. Test each key individually
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const masked = key.slice(0, 8) + '…' + key.slice(-4)

      try {
        // Light validation request — just enough to check the key works
        const testUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent('https://example.com')}&strategy=mobile&category=performance&key=${key}`

        const res = await fetch(testUrl, {
          signal: AbortSignal.timeout(30000),
        })

        if (res.ok) {
          check('pass', `Key ${i + 1} (${masked})`, 'Valid & working')
        } else if (res.status === 429) {
          check('warn', `Key ${i + 1} (${masked})`, 'Rate-limited (429) — key is valid but quota exhausted')
        } else if (res.status === 400) {
          const errData = await res.json().catch(() => ({}))
          const errMsg = errData?.error?.message || 'Bad request'
          check('fail', `Key ${i + 1} (${masked})`, `HTTP 400 — ${errMsg}`)
        } else if (res.status === 403) {
          check('fail', `Key ${i + 1} (${masked})`, 'HTTP 403 — API key invalid or PSI API not enabled in GCP console')
        } else {
          check('warn', `Key ${i + 1} (${masked})`, `HTTP ${res.status}`)
        }
      } catch (e) {
        check('fail', `Key ${i + 1} (${masked})`, `Request failed: ${e.message}`)
      }
    }
  } else if (singleKey) {
    check('warn', 'PSI_API_KEYS_POOL', 'Not set — using single fallback key only')
    check('pass', 'GOOGLE_PSI_API_KEY', `Set (${singleKey.slice(0, 8)}…)`)

    // Test single key
    try {
      const testUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent('https://example.com')}&strategy=mobile&category=performance&key=${singleKey}`
      const res = await fetch(testUrl, { signal: AbortSignal.timeout(30000) })

      if (res.ok) {
        check('pass', 'Single Key Validation', 'Valid & working')
      } else if (res.status === 429) {
        check('warn', 'Single Key Validation', 'Rate-limited (429) — try again later')
      } else if (res.status === 403) {
        check('fail', 'Single Key Validation', 'HTTP 403 — key invalid or PSI API not enabled')
      } else {
        check('warn', 'Single Key Validation', `HTTP ${res.status}`)
      }
    } catch (e) {
      check('fail', 'Single Key Validation', `Request failed: ${e.message}`)
    }
  } else {
    check('fail', 'API Keys', 'No PSI API keys configured at all. Requests will be heavily rate-limited.')
  }

  // 3c. Test PSI endpoint without key (baseline connectivity)
  try {
    const res = await fetch('https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&strategy=mobile&category=performance', {
      signal: AbortSignal.timeout(30000),
    })
    if (res.ok || res.status === 429) {
      check('pass', 'PSI API Endpoint', `Reachable (HTTP ${res.status})`)
    } else {
      check('warn', 'PSI API Endpoint', `HTTP ${res.status}`)
    }
  } catch (e) {
    check('fail', 'PSI API Endpoint', `Cannot reach Google APIs: ${e.message}`)
  }

  // 3d. Check psi-pool.ts exists
  try {
    readFileSync(resolve(__dirname, '..', 'src', 'lib', 'psi-pool.ts'))
    check('pass', 'psi-pool.ts', 'Key pool module exists')
  } catch {
    check('fail', 'psi-pool.ts', 'MISSING — PSI key rotation will not work')
  }
}

// ═══════════════════════════════════════════════
// 4. CROSS-SERVICE INTEGRATION CHECK
// ═══════════════════════════════════════════════

async function checkIntegration() {
  console.log('\n' + '═'.repeat(55))
  console.log('  🔗 CROSS-SERVICE INTEGRATION')
  console.log('═'.repeat(55))

  // 4a. Middleware + Supabase integration
  try {
    const middleware = readFileSync(resolve(__dirname, '..', 'middleware.ts'), 'utf-8')
    if (middleware.includes('createServerClient') && middleware.includes('supabase')) {
      check('pass', 'Middleware ↔ Supabase', 'Auth session checks in middleware')
    } else {
      check('warn', 'Middleware ↔ Supabase', 'No Supabase auth check found in middleware')
    }
    if (middleware.includes('/monitoring')) {
      check('pass', 'Middleware ↔ Sentry', '/monitoring tunnel route excluded from auth checks')
    }
  } catch {
    check('warn', 'Middleware', 'Could not read middleware.ts')
  }

  // 4b. Audit route ↔ all services
  try {
    const auditRoute = readFileSync(resolve(__dirname, '..', 'src', 'app', 'api', 'audit', 'full', 'route.ts'), 'utf-8')
    if (auditRoute.includes('fetchPSI')) {
      check('pass', 'Audit Route ↔ Google PSI', 'PSI pool integrated')
    }
    if (auditRoute.includes('createServerClient') || auditRoute.includes('supabase')) {
      check('pass', 'Audit Route ↔ Supabase', 'User auth/quota checks present')
    }
    if (auditRoute.includes('checkQuota') && auditRoute.includes('incrementAuditCount')) {
      check('pass', 'Quota Enforcement', 'Plan-based quota check + increment in audit pipeline')
    }
  } catch {
    check('warn', 'Audit Route', 'Could not read audit route')
  }

  // 4c. Global error boundary → Sentry
  try {
    const globalError = readFileSync(resolve(__dirname, '..', 'src', 'app', 'global-error.tsx'), 'utf-8')
    if (globalError.includes('Sentry.captureException')) {
      check('pass', 'Error Boundary ↔ Sentry', 'Global error handler reports to Sentry')
    } else {
      check('fail', 'Error Boundary ↔ Sentry', 'global-error.tsx does not call Sentry')
    }
  } catch {
    check('fail', 'Error Boundary', 'global-error.tsx not found')
  }

  // 4d. Stripe (skipped — will be configured later)
  info('Stripe: Not configured yet (intentionally deferred)')
}

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════

async function main() {
  console.log('\n' + '╔' + '═'.repeat(53) + '╗')
  console.log('║    🏥 VitalFix — Full Service Health Check          ║')
  console.log('║    ' + new Date().toISOString() + '       ║')
  console.log('╚' + '═'.repeat(53) + '╝')

  await checkSentry()
  await checkSupabase()
  await checkGooglePSI()
  await checkIntegration()

  // Final summary
  console.log('\n' + '═'.repeat(55))
  console.log('  📊 FINAL SUMMARY')
  console.log('═'.repeat(55))
  console.log(`  Total checks:  ${totalChecks}`)
  console.log(`  ${PASS} Passed:      ${passedChecks}`)
  console.log(`  ${WARN} Warnings:    ${warnChecks}`)
  console.log(`  ${FAIL} Failed:      ${failedChecks}`)
  console.log('')

  if (failedChecks === 0 && warnChecks === 0) {
    console.log('  🎉 ALL SYSTEMS GO — Everything is healthy and running!')
  } else if (failedChecks === 0) {
    console.log('  ✨ Core systems healthy — minor warnings to review above.')
  } else {
    console.log(`  ⚡ ${failedChecks} issue(s) need attention — review failures above.`)
  }
  console.log('')
}

main().catch(e => {
  console.error('Health check script failed:', e)
  process.exit(1)
})
