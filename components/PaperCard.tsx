'use client'

import Link from 'next/link'
import { Paper } from '@/lib/types'

const STATUS_LABEL: Record<string, string> = {
  read: '읽음',
  reading: '읽는 중',
  'to-read': '읽을 예정',
}

const STATUS_COLOR: Record<string, string> = {
  read: 'var(--status-read)',
  reading: 'var(--status-reading)',
  'to-read': 'var(--status-to-read)',
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg
          key={i}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill={i <= rating ? 'var(--accent)' : 'var(--border)'}
        >
          <path d="M6 1l1.18 3.09L10.5 4.5l-2.5 2.3.77 3.2L6 8.25l-2.77 1.75.77-3.2L1.5 4.5l3.32-.41z" />
        </svg>
      ))}
    </div>
  )
}

export default function PaperCard({ paper }: { paper: Paper }) {
  return (
    <Link href={`/paper/${paper.id}`}>
      <article
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
        className="rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md group"
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--accent)'
          el.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--border)'
          el.style.transform = 'translateY(0)'
        }}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status badge */}
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                background: `${STATUS_COLOR[paper.status]}18`,
                color: STATUS_COLOR[paper.status],
              }}
            >
              {STATUS_LABEL[paper.status]}
            </span>
            {/* Category */}
            {paper.category && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}
              >
                {paper.category}
              </span>
            )}
          </div>
          {paper.rating > 0 && <StarRating rating={paper.rating} />}
        </div>

        {/* Title */}
        <h2
          style={{ color: 'var(--text-primary)' }}
          className="font-semibold text-base leading-snug mb-1.5 group-hover:text-[var(--accent)] transition-colors line-clamp-2"
        >
          {paper.title}
        </h2>

        {/* Authors + venue */}
        <p
          style={{ color: 'var(--text-muted)' }}
          className="text-xs mb-3 truncate"
        >
          {paper.authors.slice(0, 3).join(', ')}
          {paper.authors.length > 3 ? ' et al.' : ''}
          {paper.venue ? ` · ${paper.venue}` : ''}
          {paper.year ? ` · ${paper.year}` : ''}
        </p>

        {/* Summary preview */}
        {paper.summary && (
          <p
            style={{ color: 'var(--text-secondary)' }}
            className="text-sm leading-relaxed line-clamp-2 mb-3"
          >
            {paper.summary}
          </p>
        )}

        {/* Tags */}
        {paper.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {paper.tags.slice(0, 4).map(tag => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-md"
                style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
              >
                #{tag}
              </span>
            ))}
            {paper.tags.length > 4 && (
              <span
                className="text-xs px-2 py-0.5 rounded-md"
                style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}
              >
                +{paper.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </article>
    </Link>
  )
}
