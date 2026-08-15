import { connectDB } from './mongodb'
import { User, UserDocument } from './user-models'
import type { UserPlan } from '../llm-registry'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'

/** Per-process cache for user.plan — reads are frequent (every tool call, every
 *  chat turn) but plan changes rarely. 60-second TTL is plenty for MVP; on plan
 *  upgrade the user may need to refresh once to see new models. */
const planCache = new Map<string, { plan: UserPlan; expiresAt: number }>()
const PLAN_CACHE_TTL_MS = 60_000

export async function createUser(data: {
  email: string
  name: string
  password: string
}): Promise<UserDocument> {
  await connectDB()
  const password_hash = await bcrypt.hash(data.password, 12)
  return User.create({
    user_id: randomUUID(),
    email: data.email.toLowerCase().trim(),
    name: data.name.trim(),
    password_hash,
  })
}

export async function getUserByEmail(email: string): Promise<UserDocument | null> {
  await connectDB()
  return User.findOne({ email: email.toLowerCase().trim() })
}

export async function getUserById(userId: string): Promise<UserDocument | null> {
  await connectDB()
  return User.findOne({ user_id: userId })
}

export async function verifyPassword(user: UserDocument, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password_hash)
}

export async function getUserProfile(userId: string) {
  await connectDB()
  const user = await User.findOne({ user_id: userId }).select('-password_hash').lean<UserDocument>()
  if (!user) return null
  return {
    user_id: user.user_id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    plan: user.plan,
    preferred_model: user.preferred_model,
    test_mode: !!user.test_mode,
    created_at: user.created_at,
  }
}

export async function updateName(userId: string, name: string): Promise<boolean> {
  await connectDB()
  const result = await User.updateOne(
    { user_id: userId },
    { $set: { name: name.trim() } }
  )
  return result.modifiedCount > 0
}

export async function updateEmail(userId: string, email: string): Promise<{ success: boolean; error?: string }> {
  await connectDB()
  const normalized = email.toLowerCase().trim()
  const existing = await User.findOne({ email: normalized, user_id: { $ne: userId } })
  if (existing) {
    return { success: false, error: '该邮箱已被其他账号使用' }
  }
  const result = await User.updateOne(
    { user_id: userId },
    { $set: { email: normalized } }
  )
  return { success: result.modifiedCount > 0 }
}

export async function updatePassword(userId: string, newPassword: string): Promise<boolean> {
  await connectDB()
  const hash = await bcrypt.hash(newPassword, 12)
  const result = await User.updateOne(
    { user_id: userId },
    { $set: { password_hash: hash } }
  )
  return result.modifiedCount > 0
}

/**
 * Get the user's subscription plan. Falls back to 'free' if the user has no plan
 * field (legacy accounts pre-migration) or does not exist. Uses a short-lived
 * in-process cache since this is called on the hot path (every tool invocation).
 */
export async function getUserPlan(userId: string): Promise<UserPlan> {
  const cached = planCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) return cached.plan

  await connectDB()
  const user = await User.findOne({ user_id: userId }, { plan: 1 }).lean() as { plan?: UserPlan } | null
  const plan: UserPlan = user?.plan ?? 'free'
  planCache.set(userId, { plan, expiresAt: Date.now() + PLAN_CACHE_TTL_MS })
  return plan
}

/** Invalidate the cached plan for a user — call this after any plan upgrade/downgrade write. */
export function invalidateUserPlanCache(userId: string): void {
  planCache.delete(userId)
}

// ==================== User model overrides (test-period account lock) ====================

/**
 * Bundle of model-related per-user override flags read together from the user
 * document. Fetched once per request and re-used across plan / model resolution
 * sites (chat route, /api/models, settings page).
 */
export interface UserModelOverrides {
  forced_main_alias?: string
  test_mode: boolean
}

const overrideCache = new Map<string, { v: UserModelOverrides; expiresAt: number }>()
const OVERRIDE_CACHE_TTL_MS = 60_000

/**
 * Read all override flags for a user with the same 60s TTL cache pattern as
 * getUserPlan. Defaults: forced main undefined, test_mode false.
 */
export async function getUserModelOverrides(userId: string): Promise<UserModelOverrides> {
  const hit = overrideCache.get(userId)
  if (hit && hit.expiresAt > Date.now()) return hit.v

  await connectDB()
  const u = await User.findOne(
    { user_id: userId },
    { forced_main_alias: 1, test_mode: 1 },
  ).lean() as {
    forced_main_alias?: string
    test_mode?: boolean
  } | null

  const v: UserModelOverrides = {
    forced_main_alias: u?.forced_main_alias ?? undefined,
    test_mode: !!u?.test_mode,
  }
  overrideCache.set(userId, { v, expiresAt: Date.now() + OVERRIDE_CACHE_TTL_MS })
  return v
}

/** Drop the cached overrides for a user — call after any write to forced fields. */
export function invalidateUserOverrideCache(userId: string): void {
  overrideCache.delete(userId)
}

/** Update or clear the user's preferred chat model alias. Pass `null` to reset to system default. */
export async function updatePreferredModel(userId: string, alias: string | null): Promise<boolean> {
  await connectDB()
  const result = alias === null
    ? await User.updateOne({ user_id: userId }, { $unset: { preferred_model: '' } })
    : await User.updateOne({ user_id: userId }, { $set: { preferred_model: alias } })
  return result.modifiedCount > 0 || result.matchedCount > 0
}
