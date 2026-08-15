import { NextRequest, NextResponse } from 'next/server'
import { updateEmail } from '@/lib/db/user-repository'
import { requireAuth } from '@/lib/auth-guard'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const userId = await requireAuth()
  if (userId instanceof Response) return userId

  const { email } = await req.json()
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 })
  }

  const result = await updateEmail(userId, email)
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? '更新失败' }, { status: 409 })
  }
  return NextResponse.json({ success: true })
}
