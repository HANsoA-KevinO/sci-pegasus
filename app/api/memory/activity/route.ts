import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-guard'
import { getMemoryActivity } from '@/lib/memory-v2/repository'

export const dynamic = 'force-dynamic'

export async function GET() {
  const userId = await requireAuth()
  if (userId instanceof Response) return userId
  return NextResponse.json(await getMemoryActivity(userId))
}
