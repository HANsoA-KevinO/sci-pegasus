import { auth } from '@/auth'

/**
 * Require authenticated user for API routes.
 * Returns userId on success, or a 401 Response on failure.
 */
export async function requireAuth(): Promise<string | Response> {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return session.user.id
}
