/**
 * Recent api_logs summary — what sources, statuses, models have we logged?
 *
 * Usage:
 *   npx tsx scripts/inspect-api-logs.ts
 */

import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import { requireMongoUri } from './runtime-env'

const envFile = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const [, k, v] = m
    if (!process.env[k]) process.env[k] = v.replace(/^["']|["']$/g, '')
  }
}

const MONGODB_URI = requireMongoUri()
const ApiLogSchema = new mongoose.Schema({}, { collection: 'api_call_logs', strict: false })
const ApiLog = mongoose.models.ApiCallLogInspector || mongoose.model('ApiCallLogInspector', ApiLogSchema)

async function main() {
  await mongoose.connect(MONGODB_URI)

  const total = await ApiLog.countDocuments({})
  console.log(`total entries: ${total}`)


  const bySource = await ApiLog.aggregate([
    { $group: { _id: { source: '$source', status: '$status' }, count: { $sum: 1 } } },
    { $sort: { '_id.source': 1, '_id.status': 1 } },
  ])
  console.log('\nby (source, status):')
  for (const row of bySource) {
    console.log(`  ${row._id.source ?? '(null)'} / ${row._id.status ?? '(null)'} : ${row.count}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recent: any[] = await ApiLog.find({})
    .sort({ timestamp: -1 })
    .limit(10)
    .select({ timestamp: 1, source: 1, model: 1, status: 1, duration_ms: 1, error_message: 1 })
    .lean()
  console.log('\nlast 10 entries:')
  for (const d of recent) {
    console.log(`  ${new Date(d.timestamp).toISOString()} | ${d.source} | ${d.model} | ${d.status} | ${d.duration_ms}ms${d.error_message ? ` | err=${d.error_message.slice(0, 100)}` : ''}`)
  }

  await mongoose.disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })
