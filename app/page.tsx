'use client'

import { useState, useEffect, useMemo } from 'react'
import { ThemeProvider } from '@/components/ThemeProvider'
import Header from '@/components/Header'
import PaperCard from '@/components/PaperCard'
import AddPaperModal from '@/components/AddPaperModal'
import { getPapers } from '@/lib/storage'
import { Paper } from '@/lib/types'

const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'read', label: '읽음' },
  { key: 'reading', label: '읽는 중' },
  { key: 'to-read', label: '읽을 예정' },
]

export default function Home() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [tag, setTag] = useState('')
  const [showModal, setShowModal] = useState(false)

  const load = () => setPapers(getPapers())
  useEffect(() => { load() }, [])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    papers.forEach(p => p.tags.forEach(t => set.add(t)))
    return Array.from(set).sort()
  }, [papers])

  const counts = useMemo(() => ({
    all: papers.length,
    read: papers.filter(p => p.status === 'read').length,
    reading: papers.filter(p => p.status === 'reading').length,
    'to-read': papers.filter(p => p.status === 'to-read').length,
  }), [papers])

  const filtered = useMemo(() => {
    return papers.filter(p => {
      if (status !== 'all' && p.status !== status) return false
      if (tag && !p.tags.includes(tag)) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          p.title.toLowerCase().includes(q) ||
          p.authors.some(a => a.toLowerCase().includes(q)) ||
          p.venue.toLowerCase().includes(q) ||
          p.summary.toLowerCase().includes(q) ||
          p.tags.some(t => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [papers, status, tag, search])

  return (
    <ThemeProvider>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Header />

        <main className="max-w-5xl mx-auto px-6 py-10">
          {/* Hero */}
          <div className="mb-10">
            <h1
              style={{ color: 'var(--text-primary)' }}
              className="text-3xl font-bold tracking-tight mb-2"
            >
              Paper Log
            </h1>
            <p style={{ color: 'var(--text-secondary)' }} className="text-base">
              읽은 논문을 기록하고, 생각을 정리하는 공간
            </p>
          </div>

          {/* Stats */}
          {papers.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: '총 논문', value: counts.all },
                { label: '읽음', value: counts.read },
                { label: '읽는 중', value: counts.reading },
              ].map(stat => (
                <div
                  key={stat.label}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  className="rounded-xl p-4 text-center"
                >
                  <div
                    style={{ color: 'var(--accent)' }}
                    className="text-2xl font-bold tracking-tight"
                  >
                    {stat.value}
                  </div>
                  <div style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search + Add */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                style={{ color: 'var(--text-muted)' }}
              >
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="제목, 저자, 태그로 검색..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 whitespace-nowrap"
              style={{ background: 'var(--accent)' }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1v11M1 6.5h11" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              논문 추가
            </button>
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 mb-5 flex-wrap">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatus(tab.key)}
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: status === tab.key ? 'var(--accent)' : 'var(--surface)',
                  color: status === tab.key ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${status === tab.key ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {tab.label}
                <span className="ml-1.5 text-xs" style={{ opacity: 0.7 }}>
                  {counts[tab.key as keyof typeof counts]}
                </span>
              </button>
            ))}
          </div>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-6">
              {tag && (
                <button
                  onClick={() => setTag('')}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-opacity hover:opacity-70"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  #{tag} ×
                </button>
              )}
              {allTags.filter(t => t !== tag).map(t => (
                <button
                  key={t}
                  onClick={() => setTag(t)}
                  className="text-xs px-2.5 py-1 rounded-full transition-all hover:opacity-80"
                  style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}

          {/* Paper grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              {papers.length === 0 ? (
                <>
                  <div
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  >
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ color: 'var(--text-muted)' }}>
                      <path
                        d="M6 4h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path d="M9 9h10M9 13h10M9 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p style={{ color: 'var(--text-primary)' }} className="font-medium mb-1">
                      아직 논문이 없어요
                    </p>
                    <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                      첫 번째 논문을 추가해보세요
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(true)}
                    className="mt-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                    style={{ background: 'var(--accent)' }}
                  >
                    논문 추가하기
                  </button>
                </>
              ) : (
                <p style={{ color: 'var(--text-muted)' }} className="text-sm">
                  검색 결과가 없어요
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(paper => (
                <PaperCard key={paper.id} paper={paper} />
              ))}
            </div>
          )}
        </main>

        {showModal && (
          <AddPaperModal
            onClose={() => setShowModal(false)}
            onAdded={load}
          />
        )}
      </div>
    </ThemeProvider>
  )
}
