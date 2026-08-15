/**
 * Pre-create beta user accounts with placeholder emails.
 *
 * Usage:
 *   npm run users:create -- user01:Pass1234 user02:Pass5678
 *
 * Each argument is username:password.
 * Email will be set to {username}@internal.sci-pegasus.local
 * Display name defaults to "muser".
 */

import { connectDB } from '../lib/db/mongodb'
import { createUser, getUserByEmail } from '../lib/db/user-repository'
import { requireMongoUri } from './runtime-env'

requireMongoUri()

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.log('Usage: npm run users:create -- user01:Pass1234 user02:Pass5678')
    process.exit(1)
  }

  await connectDB()
  console.log('Connected to MongoDB.\n')

  for (const arg of args) {
    const [username, password] = arg.split(':')
    if (!username || !password) {
      console.error(`Invalid format: "${arg}" — expected username:password`)
      continue
    }

    const email = `${username}@internal.sci-pegasus.local`

    const existing = await getUserByEmail(email)
    if (existing) {
      console.log(`SKIP  ${email} — already exists (user_id: ${existing.user_id})`)
      continue
    }

    const user = await createUser({
      email,
      name: 'muser',
      password,
    })
    console.log(`OK    ${email} — created (user_id: ${user.user_id})`)
  }

  console.log('\nDone.')
  process.exit(0)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
