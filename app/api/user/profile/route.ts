import { NextRequest, NextResponse } from 'next/server'
import {
  getUserProfile,
  updateName,
  updatePreferredModel,
  getUserPlan,
  getUserModelOverrides,
} from '@/lib/db/user-repository'
import { requireAuth } from '@/lib/auth-guard'
import { listVisibleMainAliases } from '@/lib/llm-registry'

export const dynamic = 'force-dynamic'

export async function GET() {
  const userId = await requireAuth()
  if (userId instanceof Response) return userId

  const profile = await getUserProfile(userId)
  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  return NextResponse.json(profile)
}

export async function PUT(req: NextRequest) {
  const userId = await requireAuth()
  if (userId instanceof Response) return userId

  const { name } = await req.json()
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: '名称不能为空' }, { status: 400 })
  }

  const updated = await updateName(userId, name)
  if (!updated) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

/**
 * PATCH — update the user's preferred default chat model.
 */
export async function PATCH(req: NextRequest) {
  const userId = await requireAuth()
  if (userId instanceof Response) return userId

  const body = await req.json().catch(() => ({})) as {
    preferred_model?: string | null
  }

  if (!('preferred_model' in body)) {
    return NextResponse.json({ error: 'No supported fields in PATCH body' }, { status: 400 })
  }

  const overrides = await getUserModelOverrides(userId)
  if (overrides.test_mode) {
    return NextResponse.json(
      { error: '测试模式下无法修改模型偏好' },
      { status: 403 },
    )
  }

  // ── preferred_model ──
  if ('preferred_model' in body) {
    const next = body.preferred_model ?? null
    if (next !== null && (typeof next !== 'string' || !next.trim())) {
      return NextResponse.json({ error: 'preferred_model 必须是非空字符串或 null' }, { status: 400 })
    }
    if (next !== null) {
      const plan = await getUserPlan(userId)
      const visible = listVisibleMainAliases(plan)
      if (!visible.some(v => v.alias === next)) {
        return NextResponse.json(
          { error: `alias "${next}" 不在当前 plan 可见列表中` },
          { status: 403 },
        )
      }
    }
    const saved = await updatePreferredModel(userId, next)
    if (!saved) {
      return NextResponse.json({ error: '保存失败，请重试' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
