import { NextRequest, NextResponse } from 'next/server'
import { createUser, getUserByEmail } from '@/lib/db/user-repository'
import { InviteCode } from '@/lib/db/invite-code-models'
import { connectDB } from '@/lib/db/mongodb'

export async function POST(req: NextRequest) {
  try {
    const { email, name, password, invite_code } = await req.json()

    if (!invite_code) {
      return NextResponse.json({ error: '请输入邀请码' }, { status: 400 })
    }
    if (!email || !name || !password) {
      return NextResponse.json({ error: '请填写所有必填字段' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少需要 6 个字符' }, { status: 400 })
    }

    await connectDB()

    // Validate invite code: must exist, be enabled, have remaining uses, and
    // not be past its expiry. `used_count < max_uses` is encoded as a $expr
    // because mongo can't reference another doc field via plain matchers.
    const code = await InviteCode.findOne({
      code: invite_code,
      enabled: true,
      $expr: { $lt: ['$used_count', '$max_uses'] },
      $or: [
        { expires_at: { $exists: false } },
        { expires_at: null },
        { expires_at: { $gt: new Date() } },
      ],
    })
    if (!code) {
      return NextResponse.json({ error: '邀请码无效或已过期' }, { status: 400 })
    }

    const existing = await getUserByEmail(email)
    if (existing) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 409 })
    }

    const user = await createUser({ email, name, password })

    // Atomically claim the invite code only if it still has capacity. If
    // matchedCount===0 a parallel registration grabbed the last slot between
    // the findOne above and this updateOne; the user we just created is
    // orphaned (no consumed code), so we surface a 409 and log enough info
    // for an operator to see what happened and clean it up via mongosh.
    const claim = await InviteCode.updateOne(
      {
        code: invite_code,
        enabled: true,
        $expr: { $lt: ['$used_count', '$max_uses'] },
      },
      {
        $inc: { used_count: 1 },
        $push: { used_by: { user_id: user.user_id, used_at: new Date() } },
      }
    )
    if (claim.matchedCount === 0) {
      console.error(
        `[register] invite-code race: code=${invite_code} exhausted between findOne and updateOne; ` +
        `orphaned user_id=${user.user_id} email=${email}`
      )
      return NextResponse.json(
        { error: '邀请码已被使用，请联系管理员获取新的邀请码' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      user_id: user.user_id,
      email: user.email,
      name: user.name,
    }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}
