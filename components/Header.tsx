'use client'

import Link from 'next/link'
import { useTheme } from './ThemeProvider'

export default function Header() {
  const { theme, toggle } = useTheme()

  return (
    <header
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span
            style={{ background: 'var(--accent)' }}
            className="w-6 h-6 rounded-md flex items-center justify-center"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 2h10M2 5h10M2 8h6"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span
            style={{ color: 'var(--text-primary)' }}
            className="font-semibold text-sm tracking-tight"
          >
            Paper Log
          </span>
        </Link>

        <button
          onClick={toggle}
          style={{
            background: 'var(--surface-hover)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path
                d="M7.5 1v1M7.5 13v1M1 7.5H0M15 7.5h-1M2.93 2.93l-.71-.71M12.78 12.78l-.71-.71M2.93 12.07l-.71.71M12.78 2.22l-.71.71M7.5 4.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M12.5 9.5A6 6 0 0 1 4.5 1.5a6 6 0 1 0 8 8z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </header>
  )
}
