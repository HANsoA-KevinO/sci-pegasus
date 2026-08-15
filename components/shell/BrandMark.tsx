import type { SVGProps } from 'react'

export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden {...props}>
      <rect width="40" height="40" rx="12" fill="url(#brand-bg)" />
      <path d="M10.5 12.5c4.2-1.4 7.2-.8 9.5 1.7 2.3-2.5 5.3-3.1 9.5-1.7v16.2c-4.1-1.2-7.1-.6-9.5 1.8-2.4-2.4-5.4-3-9.5-1.8V12.5Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M20 14.3v16M14 18.1h2.8M23.2 18.1H26M14 22h3.6M22.4 22H26" stroke="white" strokeWidth="1.4" strokeLinecap="round" opacity=".9" />
      <defs>
        <linearGradient id="brand-bg" x1="5" y1="4" x2="35" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#315F72" />
          <stop offset="1" stopColor="#6D4C78" />
        </linearGradient>
      </defs>
    </svg>
  )
}
