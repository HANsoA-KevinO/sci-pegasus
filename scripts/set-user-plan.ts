/**
 * Set a user's subscription plan (free / pro / team). Used during internal
 * testing to give a dev account access to all main-loop aliases.
 *
 * Usage:
 *   npx tsx scripts/set-user-plan.ts <email> <plan>
 *   npx tsx scripts/set-user-plan.ts linfeng@mufy.ai team
 */

import mongoose from 'mongoose'
import { requireMongoUri } from './runtime-env'

const MONGODB_URI = requireMongoUri()

const UserSchema = new mongoose.Schema(
  {
    user_id: String,
    email: String,
    name: String,
    plan: { type: String, enum: ['free', 'pro', 'team'], default: 'free' },
  },
  { collection: 'users', strict: false },
)
const User = mongoose.models.User || mongoose.model('User', UserSchema)

async function main() {
  const [email, plan] = process.argv.slice(2)
  if (!email || !plan) {
    console.error('Usage: npx tsx scripts/set-user-plan.ts <email> <plan>')
    process.exit(1)
  }
  if (!['free', 'pro', 'team'].includes(plan)) {
    console.error(`Invalid plan "${plan}". Must be one of: free, pro, team`)
    process.exit(1)
  }

  await mongoose.connect(MONGODB_URI)
  const normalized = email.toLowerCase().trim()
  const result = await User.updateOne({ email: normalized }, { $set: { plan } })
  if (result.matchedCount === 0) {
    console.error(`No user found with email ${normalized}`)
    process.exit(1)
  }
  console.log(`Updated ${normalized} → plan: ${plan} (modified=${result.modifiedCount})`)
  await mongoose.disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })
