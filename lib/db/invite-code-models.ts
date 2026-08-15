import mongoose, { Schema, Document } from 'mongoose'

/**
 * Invite code for registration gating.
 *
 * Single-use by default (`max_uses: 1`). When a code's `used_count` reaches
 * `max_uses` the registration endpoint's existence check fails it
 * (`used_count < max_uses`) and the code is effectively retired without
 * any explicit "consume" / "delete" step.
 *
 * Codes are created out-of-band — manually via mongosh during the beta,
 * later via the standalone admin system (which will manage this same
 * collection). Sci-Pegasus only *reads* the existence-check fields
 * and *writes* `used_count` / `used_by` after a successful registration.
 */
export interface InviteCodeDocument extends Document {
  /** The invite code itself (e.g. "SCI-2026-Q1-A7K3"). */
  code: string
  /** Human-readable label for the batch (e.g. "2026 Q1 internal beta"). */
  label: string
  /** Maximum total uses. Default 1 (single-use code). */
  max_uses: number
  /** How many times this code has been used so far. Increments after a
   *  successful registration. */
  used_count: number
  /** Audit trail — which user_ids consumed this code and when. */
  used_by: Array<{ user_id: string; used_at: Date }>
  /** Optional expiry. Codes past this time fail the registration check
   *  even if they still have available uses. */
  expires_at?: Date
  /** Admin-controlled kill switch. Disabled codes always fail. */
  enabled: boolean
  /** admin_user_id of whoever created this code (filled by the admin
   *  system when it lands; left undefined for codes created via mongosh
   *  during the manual phase). */
  created_by?: string
  created_at: Date
}

const InviteCodeSchema = new Schema<InviteCodeDocument>(
  {
    code: { type: String, required: true, unique: true, index: true },
    label: { type: String, default: '' },
    max_uses: { type: Number, default: 1 },
    used_count: { type: Number, default: 0 },
    used_by: [
      {
        _id: false,
        user_id: { type: String, required: true },
        used_at: { type: Date, default: Date.now },
      },
    ],
    expires_at: { type: Date },
    enabled: { type: Boolean, default: true, index: true },
    created_by: { type: String },
  },
  {
    // Pin the physical collection name used by the deployment administrator.
    // explicitly writes to `invite_codes`; without this, Mongoose's default
    // pluralization gives us `invitecodes` (no underscore) and the two
    // services silently end up on different collections — codes created in
    // admin look fine there but Sci-Pegasus registration reports "邀请码无效".
    collection: 'invite_codes',
    timestamps: { createdAt: 'created_at', updatedAt: false },
  },
)

export const InviteCode =
  mongoose.models.InviteCode ||
  mongoose.model<InviteCodeDocument>('InviteCode', InviteCodeSchema)
