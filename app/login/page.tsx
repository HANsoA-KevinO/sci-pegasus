'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { BrandMark } from '@/components/shell/BrandMark'

export default function LoginPage() {
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegister) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, password, invite_code: inviteCode }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || '注册失败')
          setLoading(false)
          return
        }
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        // next-auth surfaces our AccountDisabledError as result.code with
        // shape "account_disabled:<reason>". Anything else falls back to the
        // generic credential-error message (which intentionally doesn't
        // distinguish "wrong password" from "user doesn't exist").
        const code = result.code ?? ''
        if (code.startsWith('account_disabled')) {
          const reason = code.slice('account_disabled:'.length).trim()
          setError(reason ? `账号已禁用：${reason}` : '账号已禁用，如有疑问请联系管理员')
        } else {
          setError(isRegister ? '注册成功，但登录失败，请重试' : '邮箱或密码错误')
        }
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-surface">
      <section className="relative hidden min-h-screen w-1/2 items-center justify-center overflow-hidden bg-surface-low p-16 lg:flex xl:p-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,color-mix(in_srgb,var(--primary)_26%,transparent),transparent_34%),radial-gradient(circle_at_80%_80%,color-mix(in_srgb,var(--primary-container)_24%,transparent),transparent_38%)]" />

        {/* Content */}
        <div className="relative z-10 max-w-lg">
          <div className="mb-12">
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-ink-secondary font-semibold mb-4 block">
              材料科学 // 证据驱动发现
            </span>
            <h1
              className="text-5xl xl:text-7xl text-ink leading-[1.15]"
              style={{ fontFamily: 'var(--font-noto-sc)', fontWeight: 700, letterSpacing: '0.085em' }}
            >
              从<span className="text-primary italic">文献证据</span>走向科学发现
            </h1>
          </div>
          <div className="space-y-6">
            <p className="text-ink-secondary font-light text-xl leading-relaxed max-w-md">
              组织检索、抽取、核查与推理，将 Research Gap 转化为可验证、可证伪的研究假设。
            </p>
            <div className="flex items-center gap-4 pt-4">
              <div className="w-12 h-px bg-ink-muted/30" />
              <span className="text-[0.6rem] uppercase tracking-widest text-ink-muted">Sci-Pegasus · isolated research runtime</span>
            </div>
          </div>
        </div>

        {/* Top-left status indicator */}
        <div className="absolute top-8 left-8 flex items-center gap-2 z-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-[0.6rem] uppercase tracking-[0.15em] text-ink-secondary font-medium">安全网关终端</span>
        </div>
      </section>

      {/* Right — Login form */}
      <section className="w-full lg:w-1/2 flex items-center justify-center px-8 py-16 bg-surface-lowest">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <BrandMark className="mx-auto mb-3 h-11 w-11" />
            <span className="text-2xl font-bold tracking-tight text-ink">Sci-Pegasus</span>
            <h2 className="text-xl font-semibold text-ink mt-4 mb-1">
              {isRegister ? '创建账号' : 'Welcome back.'}
            </h2>
            <p className="text-sm text-ink-muted">
              {isRegister ? '注册一个新的 Sci-Pegasus 账号' : '登录你的 Sci-Pegasus 账号'}
            </p>
          </div>

          {/* `key` swap forces React to unmount + remount the entire form
              when toggling between login and register, which (combined with
              the cleared state in the mode-toggle handler) makes browsers
              treat each mode as a fresh form and stops them from auto-filling
              the saved login email into the registration field. */}
          <form key={isRegister ? 'register' : 'login'} onSubmit={handleSubmit} className="space-y-4" autoComplete={isRegister ? 'off' : 'on'}>
            {isRegister && (
              <div>
                <label className="block text-[0.65rem] uppercase tracking-wider font-medium text-ink-muted mb-1.5">
                  姓名
                </label>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="你的名字"
                  required
                  className="w-full rounded-card bg-surface-low px-4 py-3 text-sm text-ink placeholder-ink-muted focus:bg-surface-lowest focus:outline-none ghost-border pmo-field-focus transition-all"
                />
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block text-[0.65rem] uppercase tracking-wider font-medium text-ink-muted mb-1.5">
                  邀请码
                </label>
                <input
                  type="text"
                  name="invite_code"
                  autoComplete="off"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  placeholder="请输入邀请码"
                  required
                  className="w-full rounded-card bg-surface-low px-4 py-3 text-sm text-ink placeholder-ink-muted focus:bg-surface-lowest focus:outline-none ghost-border pmo-field-focus transition-all"
                />
              </div>
            )}
            <div>
              <label className="block text-[0.65rem] uppercase tracking-wider font-medium text-ink-muted mb-1.5">
                邮箱
              </label>
              <input
                type="email"
                name="email"
                /* On register: "off" tells the browser this is NOT the saved
                   login email — don't pre-fill. On login: "username" lets
                   browser password managers correlate email + password. */
                autoComplete={isRegister ? 'off' : 'username'}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full rounded-card bg-surface-low px-4 py-3 text-sm text-ink placeholder-ink-muted focus:bg-surface-lowest focus:outline-none ghost-border pmo-field-focus transition-all"
              />
            </div>

            <div>
              <label className="block text-[0.65rem] uppercase tracking-wider font-medium text-ink-muted mb-1.5">
                密码
              </label>
              <input
                type="password"
                name="password"
                /* "new-password" stops Chrome/Safari from auto-filling the
                   saved login password into the registration field, and also
                   triggers their "save new password?" prompt after submit. */
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isRegister ? '至少 6 个字符' : '••••••••'}
                required
                minLength={isRegister ? 6 : undefined}
                className="w-full rounded-card bg-surface-low px-4 py-3 text-sm text-ink placeholder-ink-muted focus:bg-surface-lowest focus:outline-none ghost-border pmo-field-focus transition-all"
              />
            </div>

            {error && (
              <div className="rounded-card bg-error/10 px-4 py-2.5 text-sm text-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-ctrl py-3.5 text-sm font-semibold text-on-primary disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))' }}
            >
              {loading ? '处理中...' : isRegister ? '注册' : '登录'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister)
                // Clear all fields when switching modes so the browser's
                // remembered login email doesn't leak into the registration
                // form (and vice-versa). Combined with the autoComplete
                // attributes on each input, this gives users a clean slate.
                setEmail('')
                setPassword('')
                setName('')
                setInviteCode('')
                setError('')
              }}
              className="text-sm text-primary hover:text-primary-container transition-colors"
            >
              {isRegister ? '已有账号？登录' : '没有账号？注册'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
