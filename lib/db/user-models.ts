import mongoose, { Schema, Document } from 'mongoose'
import type { UserPlan } from '../llm-registry'

export interface UserDocument extends Document {
  user_id: string
  email: string
  name: string
  password_hash: string
  avatar_url: string
  /** Subscription tier controlling model visibility + tool backbone choice.
   *  Defaults to 'free' for all existing and new users; upgrades are manual for now. */
  plan: UserPlan
  /** Test-period account lock: admin sets this directly via DB to pin a tester
   *  to a specific main alias regardless of their plan or in-app selection.
   *  Priority: forced > preferred > plan default. Alias must exist
   *  in registry — runtime falls back to plan default + warn if it doesn't. */
  forced_main_alias?: string
  /** User's preferred default chat model alias. New conversations start with
   *  this model; falls back to 'main_standard' when unset. */
  preferred_model?: string
  /** Test mode: when true, frontend hides model identity (chip shows "AI 助手",
   *  picker locks to a single masked entry). Backend ignores any user-supplied
   *  model selection. */
  test_mode?: boolean
  /** Account state. Drives login gate: 'disabled' / 'banned' users are rejected
   *  by NextAuth authorize() with disabled_reason surfaced to the UI. Set by
   *  the standalone admin system; Sci-Pegasus only reads. Defaults to 'active'.
   *  Existing users without this field are treated as 'active' by mongoose default. */
  status: 'active' | 'disabled' | 'banned'
  /** Most recent successful sign-in time, updated by NextAuth signIn event
   *  (fire-and-forget, doesn't block login). Used by the admin system to show
   *  user activity. Undefined = user has never logged in since field was added. */
  last_login_at?: Date
  /** Reason recorded by admin when status was flipped to 'disabled' / 'banned'.
   *  Surfaced to the user's login attempt as part of the 401 message. */
  disabled_reason?: string
  created_at: Date
  updated_at: Date
}

const UserSchema = new Schema<UserDocument>(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    password_hash: { type: String, required: true },
    avatar_url: { type: String, default: '' },
    plan: { type: String, enum: ['free', 'pro', 'team'], default: 'free', index: true },
    // Optional test-period override fields. No defaults — undefined means
    // "not set", which the runtime interprets as "fall back to plan default".
    forced_main_alias: { type: String },
    preferred_model: { type: String },
    test_mode: { type: Boolean },
    // Account state — controlled by the standalone admin system, consumed by
    // NextAuth authorize() to gate sign-in. Default 'active' covers all
    // pre-existing users transparently (no migration required).
    status: { type: String, enum: ['active', 'disabled', 'banned'], default: 'active', index: true },
    last_login_at: { type: Date },
    disabled_reason: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

export const User =
  mongoose.models.User ||
  mongoose.model<UserDocument>('User', UserSchema)
