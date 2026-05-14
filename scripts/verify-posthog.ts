// Quick PostHog feature flag verification script
// Run with: npx dotenv-cli -e .env.local -- npx tsx scripts/verify-posthog.ts

import { PostHog } from 'posthog-node'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

const FLAGS_TO_CHECK = [
  'psi-api-enabled',
  'maintenance-mode', 
  'lead-capture-enabled',
  'exit-intent-enabled',
  'social-proof-enabled',
  'audit-reminder-enabled',
]

async function verify() {
  console.log('\n🚩 PostHog Feature Flag Verification\n')
  console.log(`Key: ${POSTHOG_KEY ? POSTHOG_KEY.slice(0, 12) + '...' : '❌ NOT SET'}`)
  console.log(`Host: ${POSTHOG_HOST}`)
  
  if (!POSTHOG_KEY) {
    console.error('\n❌ NEXT_PUBLIC_POSTHOG_KEY is not set in .env.local')
    process.exit(1)
  }

  const client = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST })
  const testDistinctId = 'verify-script-test-user'

  console.log(`\nEvaluating ${FLAGS_TO_CHECK.length} flags for distinctId: "${testDistinctId}"\n`)

  // Use modern evaluateFlags API (single request for all flags)
  const flags = await client.evaluateFlags(testDistinctId, {
    flagKeys: FLAGS_TO_CHECK,
  })

  console.log('─'.repeat(55))
  console.log(`  ${'Flag Key'.padEnd(28)} ${'Value'.padEnd(10)} Status`)
  console.log('─'.repeat(55))

  let allOk = true

  for (const flag of FLAGS_TO_CHECK) {
    const value = flags.getFlag(flag)
    const display = value === undefined ? 'undefined' : String(value)
    const status = value !== undefined ? '✅' : '⚠️  not found'
    
    if (value === undefined) allOk = false
    
    console.log(`  ${flag.padEnd(28)} ${display.padEnd(10)} ${status}`)
  }

  console.log('─'.repeat(55))

  if (allOk) {
    console.log('\n✅ All flags are configured and returning values from PostHog!\n')
  } else {
    console.log('\n⚠️  Some flags returned undefined — they may not exist in PostHog yet.')
    console.log('   Create them at: https://us.posthog.com/feature_flags\n')
  }

  await client.shutdown()
}

verify().catch(console.error)
