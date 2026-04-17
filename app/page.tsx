'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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

const STATUS_COLOR: Record<string, string> = {
  read: '#10b981',
  reading: '#f59e0b',
  'to-read': '#94a3b8',
}
const STATUS_LABEL: Record<string, string> = {
  read: '읽음',
  reading: '읽는 중',
  'to-read': '읽을 예정',
}

export default function Home() {
  const router = useRouter()
  const [papers, setPapers] = useState<Paper[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [tag, setTag] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'journal'>('card')
  const [collapsedVenues, setCollapsedVenues] = useState<Set<string>>(new Set())

  const load = async () => setPapers(await getPapers())
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

  // 저널 뷰: venue → year → issue 그룹핑
  const journalGroups = useMemo(() => {
    const venueMap = new Map<string, Paper[]>()
    filtered.forEach(p => {
      const key = p.venue?.trim() || '미분류'
      if (!venueMap.has(key)) venueMap.set(key, [])
      venueMap.get(key)!.push(p)
    })

    return Array.from(venueMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([venue, venuePapers]) => {
        // year 그룹
        const yearMap = new Map<number, Map<string, Paper[]>>()
        venuePapers.forEach(p => {
          if (!yearMap.has(p.year)) yearMap.set(p.year, new Map())
          const issueKey = p.volume || p.issue
            ? `Vol.${p.volume ?? '?'} Issue ${p.issue ?? '?'}`
            : '호수 미지정'
          const issueMap = yearMap.get(p.year)!
          if (!issueMap.has(issueKey)) issueMap.set(issueKey, [])
          issueMap.get(issueKey)!.push(p)
        })

        const years = Array.from(yearMap.entries())
          .sort((a, b) => b[0] - a[0])
          .map(([year, issueMap]) => ({
            year,
            issues: Array.from(issueMap.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([issueLabel, issuePapers]) => ({ issueLabel, papers: issuePapers })),
          }))

        return { venue, papers: venuePapers, years }
      })
  }, [filtered])

  const toggleVenue = (venue: string) => {
    setCollapsedVenues(prev => {
      const next = new Set(prev)
      if (next.has(venue)) next.delete(venue)
      else next.add(venue)
      return next
    })
  }

  return (
    <ThemeProvider>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Header />

        <main className="max-w-5xl mx-auto px-6 py-10">
          {/* Hero */}
          <div className="mb-10">
            <h1 style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold tracking-tight mb-2">
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
                  <div style={{ color: 'var(--accent)' }} className="text-2xl font-bold tracking-tight">
                    {stat.value}
                  </div>
                  <div style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search + Add + View toggle */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ color: 'var(--text-muted)' }}>
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="제목, 저자, 태그로 검색..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            {/* 뷰 토글 */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <button
                onClick={() => setViewMode('card')}
                className="px-3 py-2 transition-all"
                style={{
                  background: viewMode === 'card' ? 'var(--accent)' : 'var(--surface)',
                  color: viewMode === 'card' ? 'white' : 'var(--text-muted)',
                }}
                title="카드 뷰"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('journal')}
                className="px-3 py-2 transition-all"
                style={{
                  background: viewMode === 'journal' ? 'var(--accent)' : 'var(--surface)',
                  color: viewMode === 'journal' ? 'white' : 'var(--text-muted)',
                  borderLeft: '1px solid var(--border)',
                }}
                title="저널 뷰"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M2 3h11M2 7h11M2 11h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
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

          {/* 결과 없음 */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              {papers.length === 0 ? (
                <>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} className="w-16 h-16 rounded-2xl flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ color: 'var(--text-muted)' }}>
                      <path d="M6 4h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M9 9h10M9 13h10M9 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p style={{ color: 'var(--text-primary)' }} className="font-medium mb-1">아직 논문이 없어요</p>
                    <p style={{ color: 'var(--text-muted)' }} className="text-sm">첫 번째 논문을 추가해보세요</p>
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
                <p style={{ color: 'var(--text-muted)' }} className="text-sm">검색 결과가 없어요</p>
              )}
            </div>

          ) : viewMode === 'card' ? (
            /* 카드 뷰 */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(paper => (
                <PaperCard key={paper.id} paper={paper} />
              ))}
            </div>

          ) : (
            /* 저널 뷰 */
            <div className="space-y-4">
              {journalGroups.map(({ venue, papers: venuePapers, years }) => {
                const isCollapsed = collapsedVenues.has(venue)
                return (
                  <div
                    key={venue}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    className="rounded-2xl overflow-hidden"
                  >
                    {/* 저널 헤더 */}
                    <button
                      onClick={() => toggleVenue(venue)}
                      className="w-full flex items-center justify-between px-5 py-4 transition-colors text-left"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'var(--accent-light)' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--accent)' }}>
                            <path d="M2 2h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.2" />
                            <path d="M4 5h6M4 7.5h6M4 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div>
                          <p style={{ color: 'var(--text-primary)' }} className="font-semibold text-sm">{venue}</p>
                          <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5">
                            논문 {venuePapers.length}편 · {years.length}개 연도
                          </p>
                        </div>
                      </div>
                      <svg
                        width="14" height="14" viewBox="0 0 14 14" fill="none"
                        style={{ color: 'var(--text-muted)', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                      >
                        <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {/* 연도 / Issue 목록 */}
                    {!isCollapsed && (
                      <div style={{ borderTop: '1px solid var(--border)' }}>
                        {years.map(({ year, issues }, yi) => (
                          <div key={year} style={{ borderTop: yi > 0 ? '1px solid var(--border)' : 'none' }}>
                            {/* 연도 헤더 */}
                            <div
                              className="flex items-center gap-2 px-5 py-2.5"
                              style={{ background: 'var(--surface-hover)' }}
                            >
                              <span
                                className="text-xs font-bold px-2 py-0.5 rounded-md"
                                style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                              >
                                {year}
                              </span>
                              <span style={{ color: 'var(--text-muted)' }} className="text-xs">
                                {issues.reduce((sum, i) => sum + i.papers.length, 0)}편
                              </span>
                            </div>

                            {/* Issue 그룹 */}
                            {issues.map(({ issueLabel, papers: issuePapers }, ii) => (
                              <div key={issueLabel} style={{ borderTop: '1px solid var(--border)' }}>
                                {/* Issue 라벨 (volume/issue 있을 때만) */}
                                {issueLabel !== '호수 미지정' && (
                                  <div className="px-5 py-1.5 flex items-center gap-2" style={{ background: 'var(--bg)' }}>
                                    <span style={{ color: 'var(--text-muted)' }} className="text-xs font-medium">
                                      {issueLabel}
                                    </span>
                                    <span style={{ color: 'var(--border)', fontSize: '10px' }}>
                                      {issuePapers.length}편
                                    </span>
                                  </div>
                                )}

                                {/* 논문 목록 */}
                                {issuePapers.map((paper, pi) => (
                                  <button
                                    key={paper.id}
                                    onClick={() => router.push(`/paper/${paper.id}`)}
                                    className="w-full text-left px-5 py-3.5 flex items-start gap-3 transition-colors"
                                    style={{
                                      borderTop: (issueLabel !== '호수 미지정' || pi > 0) && (issueLabel === '호수 미지정' && pi === 0 && ii === 0) ? 'none' : '1px solid var(--border)',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                  >
                                    {/* 순번 */}
                                    <span
                                      className="text-xs font-medium mt-0.5 w-5 flex-shrink-0 text-right"
                                      style={{ color: 'var(--text-muted)' }}
                                    >
                                      {pi + 1}
                                    </span>

                                    {/* 제목 + 저자 */}
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className="text-sm font-medium leading-snug mb-0.5"
                                        style={{ color: 'var(--text-primary)' }}
                                      >
                                        {paper.title}
                                      </p>
                                      {paper.authors.length > 0 && (
                                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                                          {paper.authors[0]}{paper.authors.length > 1 ? ` 외 ${paper.authors.length - 1}명` : ''}
                                        </p>
                                      )}
                                    </div>

                                    {/* 상태 + 별점 */}
                                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                                      {paper.rating > 0 && (
                                        <span className="text-xs" style={{ color: 'var(--accent)' }}>
                                          {'★'.repeat(paper.rating)}
                                        </span>
                                      )}
                                      <span
                                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                                        style={{
                                          background: `${STATUS_COLOR[paper.status]}18`,
                                          color: STATUS_COLOR[paper.status],
                                        }}
                                      >
                                        {STATUS_LABEL[paper.status]}
                                      </span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
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
