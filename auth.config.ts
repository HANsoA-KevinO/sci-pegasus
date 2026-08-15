import type { NextAuthConfig } from 'next-auth'

const secureCookies = process.env.NODE_ENV === 'production'

export const authConfig = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  cookies: {
    sessionToken: {
      name: secureCookies
        ? '__Secure-sci-pegasus.session-token'
        : 'sci-pegasus.session-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: secureCookies },
    },
    callbackUrl: {
      name: secureCookies
        ? '__Secure-sci-pegasus.callback-url'
        : 'sci-pegasus.callback-url',
      options: { sameSite: 'lax', path: '/', secure: secureCookies },
    },
    csrfToken: {
      name: secureCookies
        ? '__Host-sci-pegasus.csrf-token'
        : 'sci-pegasus.csrf-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: secureCookies },
    },
  },
  callbacks: {
    authorized({ auth: session, request }) {
      const { nextUrl } = request
      const isLoggedIn = !!session?.user
      const isLoginPage = nextUrl.pathname === '/login'
      const isAuthApi = nextUrl.pathname.startsWith('/api/auth/')

      if (isAuthApi) return true
      if (isLoginPage) return true
      if (!isLoggedIn) {
        if (nextUrl.pathname.startsWith('/api/')) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return Response.redirect(new URL('/login', nextUrl))
      }
      return true
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
      }
      // When client calls updateSession({ name: '...' }), update the JWT
      if (trigger === 'update' && session?.name) {
        token.name = session.name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
