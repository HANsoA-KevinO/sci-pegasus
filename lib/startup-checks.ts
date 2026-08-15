/**
 * Runtime environment preflight. Called once from `instrumentation.ts` before
 * the server starts serving requests. Anything required to run in production
 * but commonly forgotten (secrets, API keys, deploy URLs) goes here — we fail
 * loud on boot instead of leaving users to trip on obscure errors mid-request.
 */

interface CheckFailure {
  variable: string
  reason: string
}

const MIN_AUTH_SECRET_LEN = 32
const AUTH_SECRET_PLACEHOLDER_VALUES = new Set([
  'change-me-in-production',
  'your-secret-here',
  'replace-with-a-random-secret',
  'replace-with-at-least-32-random-characters',
  'replace-with-a-second-random-secret-at-least-32-characters',
  'secret',
])

export function runStartupChecks(): void {
  const failures: CheckFailure[] = []
  const mediaDriver = process.env.MEDIA_STORAGE_DRIVER?.trim().toLowerCase()

  // AUTH_SECRET: NextAuth signs session JWTs with this. A weak/placeholder value
  // in production means anyone can forge sessions.
  const authSecret = process.env.AUTH_SECRET
  if (!authSecret) {
    failures.push({ variable: 'AUTH_SECRET', reason: 'not set (required)' })
  } else if (authSecret.length < MIN_AUTH_SECRET_LEN) {
    failures.push({
      variable: 'AUTH_SECRET',
      reason: `length ${authSecret.length} < ${MIN_AUTH_SECRET_LEN}`,
    })
  } else if (AUTH_SECRET_PLACEHOLDER_VALUES.has(authSecret)) {
    failures.push({ variable: 'AUTH_SECRET', reason: 'matches a known placeholder value' })
  }

  // LLM gateway credentials. Without these no request can reach the model.
  for (const key of ['LLM_BASE_URL', 'LLM_API_KEY_ORCHESTRATOR', 'LLM_API_KEY_TOOLS']) {
    if (!process.env[key]) failures.push({ variable: key, reason: 'not set (required)' })
  }

  // MongoDB URI. Covered by a throw in lib/db/mongodb.ts too, but catching here
  // surfaces the misconfiguration earlier in the boot sequence.
  if (!process.env.MONGODB_URI) {
    failures.push({ variable: 'MONGODB_URI', reason: 'not set (required)' })
  }

  if (process.env.AGENT_RUNTIME_BACKGROUND_RUNNER === '1') {
    const runnerSecret = process.env.AGENT_RUNTIME_INTERNAL_SECRET
    if (!runnerSecret) {
      failures.push({
        variable: 'AGENT_RUNTIME_INTERNAL_SECRET',
        reason: 'not set (required when the durable background runner is enabled)',
      })
    } else if (runnerSecret.length < MIN_AUTH_SECRET_LEN) {
      failures.push({
        variable: 'AGENT_RUNTIME_INTERNAL_SECRET',
        reason: `length ${runnerSecret.length} < ${MIN_AUTH_SECRET_LEN}`,
      })
    } else if (AUTH_SECRET_PLACEHOLDER_VALUES.has(runnerSecret)) {
      failures.push({ variable: 'AGENT_RUNTIME_INTERNAL_SECRET', reason: 'matches a known placeholder value' })
    } else if (runnerSecret === authSecret) {
      failures.push({
        variable: 'AGENT_RUNTIME_INTERNAL_SECRET',
        reason: 'must be different from AUTH_SECRET',
      })
    }
  }

  // GridFS is the isolated self-hosted default. If OSS is selected, its
  // credential and public-CDN configuration is treated atomically.
  if (mediaDriver === 'oss') {
    for (const key of [
      'OSS_REGION',
      'OSS_BUCKET',
      'OSS_ACCESS_KEY_ID',
      'OSS_ACCESS_KEY_SECRET',
      'OSS_CDN_BASE_URL',
      'NEXT_PUBLIC_MEDIA_CDN_BASE_URL',
    ]) {
      if (!process.env[key]) failures.push({ variable: key, reason: 'not set (required for OSS media)' })
    }
    const cdnBase = process.env.OSS_CDN_BASE_URL
    const browserCdnBase = process.env.NEXT_PUBLIC_MEDIA_CDN_BASE_URL
    let serverCdnOrigin: string | undefined
    let browserCdnOrigin: string | undefined
    for (const [variable, value] of [
      ['OSS_CDN_BASE_URL', cdnBase],
      ['NEXT_PUBLIC_MEDIA_CDN_BASE_URL', browserCdnBase],
    ] as const) {
      if (!value) continue
      try {
        const parsed = new URL(value)
        if (parsed.protocol !== 'https:') throw new Error('not HTTPS')
        if (variable === 'OSS_CDN_BASE_URL') serverCdnOrigin = parsed.origin
        else browserCdnOrigin = parsed.origin
      } catch {
        failures.push({ variable, reason: 'must be a complete HTTPS URL' })
      }
    }
    if (serverCdnOrigin && browserCdnOrigin && serverCdnOrigin !== browserCdnOrigin) {
      failures.push({
        variable: 'NEXT_PUBLIC_MEDIA_CDN_BASE_URL',
        reason: 'origin must match OSS_CDN_BASE_URL',
      })
    }
    if (process.env.NODE_ENV === 'production' && !process.env.CRON_SECRET) {
      failures.push({
        variable: 'CRON_SECRET',
        reason: 'not set (required for staged asset cleanup in production)',
      })
    }
  }

  if (failures.length > 0) {
    const lines = [
      '',
      '='.repeat(72),
      '[startup] Refusing to start — environment configuration is invalid:',
      '',
      ...failures.map(f => `  - ${f.variable}: ${f.reason}`),
      '',
      'Generate a strong AUTH_SECRET with: openssl rand -base64 32',
      'See .env.local.example for the full list of required variables.',
      '='.repeat(72),
      '',
    ]
    console.error(lines.join('\n'))
    process.exit(1)
  }

  console.log('[startup] Environment check passed')
}
