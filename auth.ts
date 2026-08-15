import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { getUserByEmail, verifyPassword } from '@/lib/db/user-repository'
import { User } from '@/lib/db/user-models'
import { authConfig } from './auth.config'

/** Thrown by authorize() when a disabled / banned user attempts to sign in.
 *  next-auth surfaces `code` to the client so the login page can render a
 *  precise message ("account disabled: <reason>") instead of the generic
 *  "Email or password incorrect". */
class AccountDisabledError extends CredentialsSignin {
  constructor(public readonly reason: string) {
    super('account_disabled')
    this.code = `account_disabled:${reason || ''}`
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await getUserByEmail(credentials.email as string)
        if (!user) return null

        const valid = await verifyPassword(user, credentials.password as string)
        if (!valid) return null

        // Gate by account state — admin can flip status to 'disabled' / 'banned'
        // via the standalone admin system. Surface disabled_reason in the error
        // code so the login page can show "账号已禁用：<原因>".
        if (user.status === 'disabled' || user.status === 'banned') {
          throw new AccountDisabledError(user.disabled_reason ?? '')
        }

        // Fire-and-forget last_login_at update — must not block the login
        // response. A failed write (transient mongo issue) shouldn't reject
        // an otherwise valid login.
        User.updateOne({ user_id: user.user_id }, { $set: { last_login_at: new Date() } })
          .catch(err => console.error('[auth] last_login_at update failed:', (err as Error).message))

        return {
          id: user.user_id,
          email: user.email,
          name: user.name,
          image: user.avatar_url || null,
        }
      },
    }),
  ],
})
