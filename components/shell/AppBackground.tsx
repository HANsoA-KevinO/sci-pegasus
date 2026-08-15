'use client'

import type { JSX } from 'react'

export type AppBackgroundState = 'landing' | 'idle' | 'running'

/** Lightweight application atmosphere, intentionally independent of Canvas. */
export function AppBackground({ state }: { state: AppBackgroundState }): JSX.Element {
  const active = state === 'running'
  const landing = state === 'landing'

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-surface"
    >
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: active ? 0.95 : landing ? 0.7 : 0.45,
          background: [
            'radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--primary) 20%, transparent) 0, transparent 34%)',
            'radial-gradient(circle at 82% 12%, color-mix(in srgb, var(--tertiary, var(--primary)) 16%, transparent) 0, transparent 32%)',
            'radial-gradient(circle at 58% 88%, color-mix(in srgb, var(--primary-container) 18%, transparent) 0, transparent 38%)',
          ].join(','),
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.16] dark:opacity-[0.12]"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--ink-muted) 0.75px, transparent 0.9px)',
          backgroundSize: '22px 22px',
          maskImage: 'linear-gradient(to bottom, black, transparent 90%)',
        }}
      />
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{
          backdropFilter: state === 'idle' ? 'blur(18px) saturate(1.25)' : 'blur(2px)',
          WebkitBackdropFilter: state === 'idle' ? 'blur(18px) saturate(1.25)' : 'blur(2px)',
        }}
      />
    </div>
  )
}
