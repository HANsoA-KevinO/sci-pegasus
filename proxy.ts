import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

export default NextAuth(authConfig).auth

export const config = {
  matcher: [
    // Exclude:
    //   api/auth   — NextAuth's own callbacks (login flow)
    //   api/health — public liveness probe (used by Docker healthcheck + nginx upstream)
    //   api/chat   — every chat route authenticates inside the handler. The root route
    //                accepts either a browser session or the durable Runner's HMAC +
    //                exact Run/lease fence; nested routes always require a user session.
    //                Keeping this boundary out of Auth.js is required because the
    //                loopback Runner has no browser session.
    //   api/agent-team/execute — private member executor authenticated by the
    //                same exact Run/lease HMAC + Team fence. Auth.js must not
    //                reject the loopback Runner for lacking a browser cookie.
    //   api/media  — public capability URLs fetched by external model providers;
    //                upload still calls requireAuth() inside its route handler
    //   login      — login page itself
    //   _next/*    — Next.js static assets
    //   favicon.ico
    '/((?!api/auth|api/chat(?:/|$)|api/agent-team/execute(?:/|$)|api/health|api/media/|login|_next/static|_next/image|favicon.ico).*)',
  ],
}
