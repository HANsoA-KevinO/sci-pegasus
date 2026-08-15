import mongoose from 'mongoose'
import { requireMongoUri } from './runtime-env'

const MONGODB_URI = requireMongoUri()

const UserSchema = new mongoose.Schema(
  { user_id: String, email: String, name: String, plan: String },
  { strict: false, collection: 'users' },
)
const User = mongoose.models.User || mongoose.model('User', UserSchema)

async function main() {
  await mongoose.connect(MONGODB_URI)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = await User.find({}, { email: 1, name: 1, plan: 1 }).lean() as any[]
  for (const u of users) console.log(`${u.email ?? '(no email)'} | ${u.name ?? '(no name)'} | plan=${u.plan ?? '(unset)'}`)
  console.log(`--- ${users.length} users total ---`)
  await mongoose.disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
