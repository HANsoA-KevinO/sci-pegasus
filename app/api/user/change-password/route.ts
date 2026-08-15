import { NextRequest, NextResponse } from 'next/server'
import { getUserById, verifyPassword, updatePassword } from '@/lib/db/user-repository'
import { requireAuth } from '@/lib/auth-guard'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const userId = await requireAuth()
  if (userId instanceof Response) return userId

  const { old_password, new_password } = await req.json()

  if (!old_password || !new_password) {
    return NextResponse.json({ error: '请填写所有字段' }, { status: 400 })
  }
  if (new_password.length < 6) {
    return NextResponse.json({ error: '新密码至少需要 6 个字符' }, { status: 400 })
  }

  const user = await getUserById(userId)
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const valid = await verifyPassword(user, old_password)
  if (!valid) {
    return NextResponse.json({ error: '当前密码不正确' }, { status: 403 })
  }

  await updatePassword(userId, new_password)
  return NextResponse.json({ success: true })
}
