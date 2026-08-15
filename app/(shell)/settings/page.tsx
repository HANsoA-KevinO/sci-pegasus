'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useModels } from '@/hooks/useModels'

interface UserProfile {
  user_id: string
  email: string
  name: string
  avatar_url: string
  plan?: string
  preferred_model?: string
  test_mode?: boolean
  created_at: string
}

const TABS = [
  { id: 'profile', label: '个人信息' },
  { id: 'preferences', label: '偏好设置' },
  { id: 'security', label: '安全与密码' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function SettingsPage() {
  const { update: updateSession } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  // Personal info
  const [name, setName] = useState('')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Email binding
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Password
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Preferred chat model
  const { models: chatModels, isLoading: chatModelsLoading } = useModels()
  const [preferredModel, setPreferredModel] = useState<string | undefined>(undefined)
  const [modelMsg, setModelMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(data => {
        setProfile(data)
        setName(data.name || '')
        setPreferredModel(data.preferred_model)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleModelChange = async (next: string | null) => {
    const prev = preferredModel
    setPreferredModel(next ?? undefined)
    setModelMsg(null)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_model: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setPreferredModel(prev)
        setModelMsg({ type: 'error', text: data.error || '保存失败' })
        return
      }
      setModelMsg({ type: 'success', text: '已保存' })
    } catch {
      setPreferredModel(prev)
      setModelMsg({ type: 'error', text: '网络错误' })
    }
  }

  const handleNameSave = async () => {
    if (!name.trim()) return
    setNameLoading(true)
    setNameMsg(null)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        setNameMsg({ type: 'success', text: '名称已更新' })
        setProfile(p => p ? { ...p, name: name.trim() } : p)
        await updateSession({ name: name.trim() })
      } else {
        const data = await res.json()
        setNameMsg({ type: 'error', text: data.error || '更新失败' })
      }
    } catch {
      setNameMsg({ type: 'error', text: '网络错误' })
    } finally {
      setNameLoading(false)
    }
  }

  const handleEmailBind = async () => {
    if (!newEmail.includes('@')) return
    setEmailLoading(true)
    setEmailMsg(null)
    try {
      const res = await fetch('/api/user/bind-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      })
      const data = await res.json()
      if (res.ok) {
        setEmailMsg({ type: 'success', text: '邮箱已更新，下次登录请使用新邮箱' })
        setProfile(p => p ? { ...p, email: newEmail.toLowerCase().trim() } : p)
        setNewEmail('')
      } else {
        setEmailMsg({ type: 'error', text: data.error || '绑定失败' })
      }
    } catch {
      setEmailMsg({ type: 'error', text: '网络错误' })
    } finally {
      setEmailLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: '两次输入的密码不一致' })
      return
    }
    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: '新密码至少需要 6 个字符' })
      return
    }
    setPwdLoading(true)
    setPwdMsg(null)
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setPwdMsg({ type: 'success', text: '密码已更新' })
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPwdMsg({ type: 'error', text: data.error || '修改失败' })
      }
    } catch {
      setPwdMsg({ type: 'error', text: '网络错误' })
    } finally {
      setPwdLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-ink-muted text-sm">加载中...</span>
      </div>
    )
  }

  const initial = (profile?.name || 'M').charAt(0).toUpperCase()
  const isInternalEmail = profile?.email?.endsWith('@internal.sci-pegasus.local')

  return (
    <div className="flex-1 overflow-y-auto py-10 px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-title font-semibold text-ink tracking-tight mb-8">设置</h1>

        {/* 设置正文装进玻璃 sheet:内容不再裸露在极光网点上,活背景收敛为环绕氛围 */}
        <div className="rounded-glass bg-[var(--glass-panel-bg)] backdrop-blur-[24px] backdrop-saturate-150 border border-[var(--glass-panel-border)] shadow-[var(--shadow-glass)] p-8">
        <div className="flex gap-12">
          {/* Left — Tab navigation */}
          <nav className="w-44 shrink-0 space-y-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-2.5 rounded-card text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-[var(--glass-panel-bg)] backdrop-blur-[20px] backdrop-saturate-150 shadow-[var(--shadow-glass)] text-ink font-semibold'
                    : 'text-ink-muted hover:text-ink hover:bg-white/40 dark:hover:bg-white/[0.06]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right — Content area */}
          <div className="flex-1 min-w-0">
            {activeTab === 'profile' && (
              <div className="space-y-8">
                {/* Profile section */}
                <section className="space-y-6">
                  <h2 className="text-lg font-semibold text-ink">个人资料</h2>

                  {/* Name row */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-ink-secondary">
                      用户名
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-surface-mid flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-ink-secondary">{initial}</span>
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="flex-1 rounded-card bg-black/[0.03] dark:bg-white/[0.05] px-4 py-3 text-sm text-ink placeholder-ink-muted focus:outline-none shadow-[inset_0_0_0_1px_var(--glass-panel-border)] pmo-field-focus transition-all"
                      />
                      <button
                        onClick={handleNameSave}
                        disabled={nameLoading || name.trim() === profile?.name}
                        className="px-5 py-3 rounded-ctrl text-sm font-medium text-on-primary disabled:opacity-40 transition-all shrink-0"
                        style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))' }}
                      >
                        {nameLoading ? '...' : '保存'}
                      </button>
                    </div>
                    {nameMsg && (
                      <p className={`text-xs ${nameMsg.type === 'success' ? 'text-success' : 'text-error'}`}>
                        {nameMsg.text}
                      </p>
                    )}
                  </div>

                  <div className="h-px bg-outline-variant/15" />

                  {/* Email section */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-ink-secondary">
                      邮箱
                    </label>
                    <p className="text-sm text-ink">
                      {profile?.email}
                      {isInternalEmail && (
                        <span className="ml-2 text-xs text-warning">(占位邮箱，请绑定真实邮箱)</span>
                      )}
                    </p>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="输入新邮箱地址"
                        className="flex-1 rounded-card bg-black/[0.03] dark:bg-white/[0.05] px-4 py-3 text-sm text-ink placeholder-ink-muted focus:outline-none shadow-[inset_0_0_0_1px_var(--glass-panel-border)] pmo-field-focus transition-all"
                      />
                      <button
                        onClick={handleEmailBind}
                        disabled={emailLoading || !newEmail.includes('@')}
                        className="px-5 py-3 rounded-ctrl text-sm font-medium text-on-primary disabled:opacity-40 transition-all shrink-0"
                        style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))' }}
                      >
                        {emailLoading ? '...' : '换绑'}
                      </button>
                    </div>
                    {emailMsg && (
                      <p className={`text-xs ${emailMsg.type === 'success' ? 'text-success' : 'text-error'}`}>
                        {emailMsg.text}
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-8">
                {/* Chat model preference */}
                {!profile?.test_mode && (
                  <section className="space-y-6">
                    <h2 className="text-lg font-semibold text-ink">默认对话模型</h2>
                    {chatModelsLoading ? (
                      <p className="text-sm text-ink-muted">加载中...</p>
                    ) : (
                      <div className="space-y-3 max-w-md">
                        <p className="text-sm text-ink-muted">
                          新建项目时默认使用此模型。单个项目内仍可单独切换。
                        </p>
                        <div className="space-y-2">
                          {/* If saved preference is no longer visible to this plan, treat as "system default" */}
                          {(() => {
                            const effectiveModel = preferredModel && chatModels.some(m => m.id === preferredModel) ? preferredModel : undefined
                            return (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleModelChange(null)}
                                  className={`w-full text-left px-4 py-3 rounded-card text-sm transition-all backdrop-blur-[20px] backdrop-saturate-150 ${
                                    !effectiveModel
                                      ? 'bg-[var(--glass-panel-bg)] text-ink font-medium ring-1 ring-primary shadow-[var(--shadow-glass)]'
                                      : 'text-ink-secondary bg-white/30 dark:bg-white/[0.04] shadow-[inset_0_0_0_1px_var(--glass-panel-border)] hover:bg-white/50 dark:hover:bg-white/[0.07]'
                                  }`}
                                >
                                  <div className="font-medium">系统默认</div>
                                  <div className="text-xs text-ink-muted mt-0.5">按套餐自动选择</div>
                                </button>
                                {chatModels.map(m => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleModelChange(m.id)}
                                    className={`w-full text-left px-4 py-3 rounded-card text-sm transition-all backdrop-blur-[20px] backdrop-saturate-150 ${
                                      effectiveModel === m.id
                                        ? 'bg-[var(--glass-panel-bg)] text-ink font-medium ring-1 ring-primary shadow-[var(--shadow-glass)]'
                                        : 'text-ink-secondary bg-white/30 dark:bg-white/[0.04] shadow-[inset_0_0_0_1px_var(--glass-panel-border)] hover:bg-white/50 dark:hover:bg-white/[0.07]'
                                    }`}
                                  >
                                    <div className="font-medium">{m.name}</div>
                                    {m.description && (
                                      <div className="text-xs text-ink-muted mt-0.5">{m.description}</div>
                                    )}
                                  </button>
                                ))}
                              </>
                            )
                          })()}
                        </div>
                        {modelMsg && (
                          <p className={`text-xs ${modelMsg.type === 'success' ? 'text-success' : 'text-error'}`}>
                            {modelMsg.text}
                          </p>
                        )}
                      </div>
                    )}
                  </section>
                )}

              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8">
                <section className="space-y-6">
                  <h2 className="text-lg font-semibold text-ink">修改密码</h2>

                  <div className="max-w-md space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-ink-secondary">
                        当前密码
                      </label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        placeholder="输入当前密码"
                        className="w-full rounded-card bg-black/[0.03] dark:bg-white/[0.05] px-4 py-3 text-sm text-ink placeholder-ink-muted focus:outline-none shadow-[inset_0_0_0_1px_var(--glass-panel-border)] pmo-field-focus transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-ink-secondary">
                        新密码
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="至少 6 个字符"
                        className="w-full rounded-card bg-black/[0.03] dark:bg-white/[0.05] px-4 py-3 text-sm text-ink placeholder-ink-muted focus:outline-none shadow-[inset_0_0_0_1px_var(--glass-panel-border)] pmo-field-focus transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-ink-secondary">
                        确认新密码
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="再次输入新密码"
                        className="w-full rounded-card bg-black/[0.03] dark:bg-white/[0.05] px-4 py-3 text-sm text-ink placeholder-ink-muted focus:outline-none shadow-[inset_0_0_0_1px_var(--glass-panel-border)] pmo-field-focus transition-all"
                      />
                    </div>

                    {pwdMsg && (
                      <p className={`text-xs ${pwdMsg.type === 'success' ? 'text-success' : 'text-error'}`}>
                        {pwdMsg.text}
                      </p>
                    )}

                    <button
                      onClick={handlePasswordChange}
                      disabled={pwdLoading || !oldPassword || !newPassword || !confirmPassword}
                      className="px-6 py-3 rounded-ctrl text-sm font-medium text-on-primary disabled:opacity-40 transition-all"
                      style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))' }}
                    >
                      {pwdLoading ? '处理中...' : '修改密码'}
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
