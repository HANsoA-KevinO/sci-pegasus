'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { BrandMark } from './BrandMark'

const NAV_LINKS = [
  { href: '/', label: '研究工作台' },
  { href: '/library', label: '项目库' },
  { href: '/store', label: '记忆' },
]

export function TopNavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const userName = session?.user?.name || 'Researcher'

  useEffect(() => {
    if (!showMenu) return
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showMenu])

  return (
    <nav className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[var(--glass-panel-border)] bg-[color-mix(in_srgb,var(--glass-panel-bg)_70%,transparent)] px-8 backdrop-blur-xl">
      <div className="flex items-center gap-9">
        <Link href="/" className="group flex items-center gap-2.5">
          <BrandMark className="h-8 w-8 transition-transform group-hover:scale-105" />
          <span className="text-lg font-bold tracking-tight text-ink">Sci-Pegasus</span>
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map(link => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition-colors ${active ? 'font-semibold text-primary' : 'text-ink-muted hover:text-ink'}`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-label="打开用户菜单"
          onClick={() => setShowMenu(value => !value)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-mid text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-low"
        >
          {userName.charAt(0).toUpperCase()}
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-card border border-[var(--glass-panel-border)] bg-[var(--glass-panel-bg)] py-2 shadow-[var(--shadow-glass)] backdrop-blur-xl">
            <div className="border-b border-outline-variant/15 px-4 py-3">
              <p className="truncate text-sm font-semibold text-ink">{userName}</p>
              <p className="truncate text-xs text-ink-muted">{session?.user?.email || ''}</p>
            </div>
            <button type="button" onClick={() => { setShowMenu(false); router.push('/settings') }} className="w-full px-4 py-2.5 text-left text-sm text-ink-secondary hover:bg-surface-low hover:text-ink">
              个人设置
            </button>
            <button type="button" onClick={() => signOut({ callbackUrl: '/login' })} className="w-full px-4 py-2.5 text-left text-sm text-ink-secondary hover:bg-surface-low hover:text-ink">
              退出登录
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
