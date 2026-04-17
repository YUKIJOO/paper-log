'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeProvider, useTheme } from '@/components/ThemeProvider'
import AddPaperModal from '@/components/AddPaperModal'
import { getPapers } from '@/lib/storage'
import { Paper } from '@/lib/types'

// ─── 상수 ────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  read: '#10b981', reading: '#f59e0b', 'to-read': '#94a3b8',
}
const STATUS_LABEL: Record<string, string> = {
  read: '읽음', reading: '읽는 중', 'to-read': '읽을 예정',
}
const SECTION_KEYS = ['introduction', 'literatureReview', 'method', 'results', 'discussion', 'limitation'] as const
const SECTION_LABEL: Record<string, string> = {
  introduction: 'Intro', literatureReview: 'Lit.', method: 'Method',
  results: 'Results', discussion: 'Discussion', limitation: 'Limitation',
}

function filledSections(p: Paper) {
  return SECTION_KEYS.filter(k => (p[k] as string)?.trim()).length
}

// ─── 타입 ────────────────────────────────────────────────────────
type ViewType = 'home' | 'journal' | 'deepread' | 'stats' | 'status' | 'tag'

// ─── 논문 행 (저널 뷰, 목록 공용) ────────────────────────────────
function PaperRow({ paper, onClick }: { paper: Paper; onClick: () => void }) {
  const filled = filledSections(paper)
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-5 py-3.5 flex items-center gap-4 transition-colors"
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug truncate" style={{ color: 'var(--text-primary)' }}>
          {paper.title}
        </p>
        {paper.authors.length > 0 && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
            {paper.authors[0]}{paper.authors.length > 1 ? ` 외 ${paper.authors.length - 1}명` : ''}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {filled > 0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{
              background: filled === 6 ? 'var(--accent-light)' : 'var(--surface-hover)',
              color: filled === 6 ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            {filled}/6
          </span>
        )}
        {paper.rating > 0 && (
          <span className="text-xs" style={{ color: 'var(--accent)', letterSpacing: '-1px' }}>
            {'★'.repeat(paper.rating)}
          </span>
        )}
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: `${STATUS_COLOR[paper.status]}18`, color: STATUS_COLOR[paper.status] }}
        >
          {STATUS_LABEL[paper.status]}
        </span>
      </div>
    </button>
  )
}

// ─── 저널 뷰 ────────────────────────────────────────────────────
function JournalView({ papers, onPaper, onAdd }: { papers: Paper[]; onPaper: (id: string) => void; onAdd: () => void }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const byVenue = useMemo(() => {
    const map = new Map<string, Paper[]>()
    papers.forEach(p => {
      const key = p.venue?.trim() || '미분류'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    })
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [papers])

  if (byVenue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p style={{ color: 'var(--text-muted)' }} className="text-sm">저널이 없어요</p>
        <button onClick={onAdd} className="text-sm px-4 py-2 rounded-lg text-white" style={{ background: 'var(--accent)' }}>
          논문 추가하기
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {byVenue.map(([venue, venuePapers]) => {
        const isOpen = !collapsed.has(venue)
        const yearMap = new Map<number, Map<string, Paper[]>>()
        venuePapers.forEach(p => {
          if (!yearMap.has(p.year)) yearMap.set(p.year, new Map())
          const ik = (p.volume || p.issue) ? `Vol.${p.volume ?? '?'} Issue ${p.issue ?? '?'}` : ''
          const im = yearMap.get(p.year)!
          if (!im.has(ik)) im.set(ik, [])
          im.get(ik)!.push(p)
        })
        const years = Array.from(yearMap.entries()).sort((a, b) => b[0] - a[0])

        return (
          <div key={venue} style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} className="rounded-2xl overflow-hidden">
            <button
              onClick={() => setCollapsed(prev => { const n = new Set(prev); isOpen ? n.add(venue) : n.delete(venue); return n })}
              className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{venue}</span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                  {venuePapers.length}편 · {years.length}개 연도
                </span>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform .2s' }}>
                <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {years.map(([year, issueMap], yi) => {
                  const issues = Array.from(issueMap.entries())
                  return (
                    <div key={year} style={{ borderTop: yi > 0 ? '1px solid var(--border)' : 'none' }}>
                      <div className="flex items-center gap-2 px-5 py-2" style={{ background: 'var(--bg)' }}>
                        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                          {year}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {issues.reduce((s, [, ps]) => s + ps.length, 0)}편
                        </span>
                      </div>
                      {issues.map(([issueLabel, issuePapers], ii) => (
                        <div key={ii} style={{ borderTop: '1px solid var(--border)' }}>
                          {issueLabel && (
                            <div className="px-5 py-1.5" style={{ background: 'var(--surface-hover)' }}>
                              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{issueLabel}</span>
                            </div>
                          )}
                          {issuePapers.map(p => (
                            <div key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                              <PaperRow paper={p} onClick={() => onPaper(p.id)} />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── 홈 뷰 ──────────────────────────────────────────────────────
function HomeView({ papers, onPaper, onAdd }: { papers: Paper[]; onPaper: (id: string) => void; onAdd: () => void }) {
  const recent = [...papers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)
  const filled6 = papers.filter(p => filledSections(p) === 6).length
  const venues = new Set(papers.map(p => p.venue?.trim()).filter(Boolean)).size

  const stats = [
    { label: '총 논문', value: papers.length },
    { label: '읽음', value: papers.filter(p => p.status === 'read').length },
    { label: '읽는 중', value: papers.filter(p => p.status === 'reading').length },
    { label: '저널 수', value: venues },
    { label: '정독 완료', value: filled6 },
  ]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-5 gap-3">
        {stats.map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} className="rounded-xl p-4 text-center">
            <div className="text-2xl font-bold tracking-tight" style={{ color: 'var(--accent)' }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {recent.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>최근 추가</p>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} className="rounded-2xl overflow-hidden">
            {recent.map((p, i) => (
              <div key={p.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <PaperRow paper={p} onClick={() => onPaper(p.id)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {papers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">아직 논문이 없어요</p>
          <button onClick={onAdd} className="text-sm px-4 py-2 rounded-lg text-white" style={{ background: 'var(--accent)' }}>
            첫 논문 추가하기
          </button>
        </div>
      )}
    </div>
  )
}

// ─── 정독 노트 뷰 ───────────────────────────────────────────────
function DeepReadView({ papers, onPaper }: { papers: Paper[]; onPaper: (id: string) => void }) {
  const deep = useMemo(() =>
    [...papers].filter(p => filledSections(p) >= 3).sort((a, b) => filledSections(b) - filledSections(a)),
    [papers])

  if (deep.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p style={{ color: 'var(--text-muted)' }} className="text-sm">섹션을 3개 이상 작성한 논문이 없어요</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {deep.map(p => {
        const n = filledSections(p)
        return (
          <button
            key={p.id}
            onClick={() => onPaper(p.id)}
            className="w-full text-left rounded-2xl p-5 transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{p.title}</p>
              <span className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
                style={{ background: n === 6 ? 'var(--accent)' : 'var(--accent-light)', color: n === 6 ? 'white' : 'var(--accent)' }}>
                {n}/6
              </span>
            </div>
            <div className="flex gap-1.5">
              {SECTION_KEYS.map(k => {
                const done = !!(p[k] as string)?.trim()
                return (
                  <span key={k} className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: done ? 'var(--accent-light)' : 'var(--surface-hover)',
                      color: done ? 'var(--accent)' : 'var(--text-muted)',
                    }}>
                    {SECTION_LABEL[k]}
                  </span>
                )
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── 통계 뷰 ────────────────────────────────────────────────────
function StatsView({ papers }: { papers: Paper[] }) {
  const byVenue = useMemo(() => {
    const m = new Map<string, number>()
    papers.forEach(p => { const k = p.venue?.trim() || '미분류'; m.set(k, (m.get(k) ?? 0) + 1) })
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [papers])

  const byYear = useMemo(() => {
    const m = new Map<number, number>()
    papers.forEach(p => { m.set(p.year, (m.get(p.year) ?? 0) + 1) })
    return Array.from(m.entries()).sort((a, b) => b[0] - a[0]).slice(0, 8)
  }, [papers])

  const maxVenue = Math.max(...byVenue.map(([, n]) => n), 1)
  const maxYear = Math.max(...byYear.map(([, n]) => n), 1)

  const sectionStats = SECTION_KEYS.map(k => ({
    label: SECTION_LABEL[k],
    count: papers.filter(p => !!(p[k] as string)?.trim()).length,
  }))

  return (
    <div className="space-y-8">
      {[
        { title: '저널별 논문 수', data: byVenue.map(([l, v]) => ({ label: l, value: v })), max: maxVenue },
        { title: '연도별 논문 수', data: byYear.map(([l, v]) => ({ label: String(l), value: v })), max: maxYear },
      ].map(({ title, data, max }) => (
        <div key={title} style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} className="rounded-2xl p-6">
          <p className="text-sm font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>{title}</p>
          <div className="space-y-3">
            {data.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs w-32 truncate flex-shrink-0 text-right" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <div className="flex-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-hover)', height: 8 }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, background: 'var(--accent)' }} />
                </div>
                <span className="text-xs font-medium w-6 text-right" style={{ color: 'var(--accent)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} className="rounded-2xl p-6">
        <p className="text-sm font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>섹션 작성 현황</p>
        <div className="grid grid-cols-3 gap-3">
          {sectionStats.map(({ label, count }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-hover)' }}>
              <div className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{count}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
                / {papers.length}편
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── 사이드바 ───────────────────────────────────────────────────
function Sidebar({
  papers, view, selectedKey, onSelect,
}: {
  papers: Paper[]
  view: ViewType
  selectedKey: string
  onSelect: (view: ViewType, key?: string) => void
}) {
  const { theme, toggle } = useTheme()

  const venues = useMemo(() => {
    const m = new Map<string, number>()
    papers.forEach(p => { const k = p.venue?.trim() || '미분류'; m.set(k, (m.get(k) ?? 0) + 1) })
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }, [papers])

  const tags = useMemo(() => {
    const m = new Map<string, number>()
    papers.forEach(p => p.tags.forEach(t => m.set(t, (m.get(t) ?? 0) + 1)))
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12)
  }, [papers])

  const statusCounts = {
    read: papers.filter(p => p.status === 'read').length,
    reading: papers.filter(p => p.status === 'reading').length,
    'to-read': papers.filter(p => p.status === 'to-read').length,
  }

  const navItem = (label: string, v: ViewType, key = '', count?: number) => {
    const active = view === v && selectedKey === key
    return (
      <button
        key={label}
        onClick={() => onSelect(v, key)}
        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all text-left"
        style={{
          background: active ? 'var(--accent-light)' : 'transparent',
          color: active ? 'var(--accent)' : 'var(--text-secondary)',
          fontWeight: active ? 600 : 400,
        }}
      >
        <span className="truncate">{label}</span>
        {count !== undefined && (
          <span className="text-xs ml-1 flex-shrink-0" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
            {count}
          </span>
        )}
      </button>
    )
  }

  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
        height: 'calc(100vh - 56px)',
        overflowY: 'auto',
        position: 'sticky',
        top: 56,
      }}
    >
      <div className="p-3 space-y-1">
        {/* 로고 + 테마 */}
        <div className="flex items-center justify-between px-3 py-2 mb-2">
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Paper Log</span>
          <button onClick={toggle} className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
            {theme === 'light' ? (
              <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 1v1M7.5 13v1M1 7.5H0M15 7.5h-1M2.93 2.93l-.71-.71M12.78 12.78l-.71-.71M2.93 12.07l-.71.71M12.78 2.22l-.71.71M7.5 4.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M12.5 9.5A6 6 0 0 1 4.5 1.5a6 6 0 1 0 8 8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        {navItem('🏠  홈', 'home')}
        {navItem('📖  정독 노트', 'deepread')}
        {navItem('📈  통계', 'stats')}

        {/* 저널 */}
        {venues.length > 0 && (
          <>
            <div className="px-3 pt-4 pb-1">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>저널</span>
            </div>
            {venues.map(([v, n]) => navItem(v, 'journal', v, n))}
          </>
        )}

        {/* 상태 */}
        <div className="px-3 pt-4 pb-1">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>상태</span>
        </div>
        {navItem('읽음', 'status', 'read', statusCounts.read)}
        {navItem('읽는 중', 'status', 'reading', statusCounts.reading)}
        {navItem('읽을 예정', 'status', 'to-read', statusCounts['to-read'])}

        {/* 태그 */}
        {tags.length > 0 && (
          <>
            <div className="px-3 pt-4 pb-1">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>태그</span>
            </div>
            {tags.map(([t, n]) => navItem(`#${t}`, 'tag', t, n))}
          </>
        )}
      </div>
    </aside>
  )
}

// ─── 메인 앱 ───────────────────────────────────────────────────
function App() {
  const router = useRouter()
  const [papers, setPapers] = useState<Paper[]>([])
  const [view, setView] = useState<ViewType>('home')
  const [selectedKey, setSelectedKey] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')

  const load = async () => setPapers(await getPapers())
  useEffect(() => { load() }, [])

  const handleSelect = (v: ViewType, key = '') => {
    setView(v)
    setSelectedKey(key)
    setSearch('')
  }

  const handlePaper = (id: string) => router.push(`/paper/${id}`)

  const filtered = useMemo(() => {
    let list = papers
    if (view === 'journal' && selectedKey) list = list.filter(p => (p.venue?.trim() || '미분류') === selectedKey)
    if (view === 'status' && selectedKey) list = list.filter(p => p.status === selectedKey)
    if (view === 'tag' && selectedKey) list = list.filter(p => p.tags.includes(selectedKey))
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.authors.some(a => a.toLowerCase().includes(q)) ||
        p.venue.toLowerCase().includes(q)
      )
    }
    return list
  }, [papers, view, selectedKey, search])

  const pageTitle: Record<ViewType, string> = {
    home: '홈',
    journal: selectedKey || '저널',
    deepread: '정독 노트',
    stats: '통계',
    status: STATUS_LABEL[selectedKey] ?? selectedKey,
    tag: `#${selectedKey}`,
  }

  const showSearch = view === 'journal' || view === 'status' || view === 'tag'

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* 헤더 */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }} className="sticky top-0 z-50 h-14 flex items-center px-5 justify-between">
        <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Paper Log</span>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-white px-3.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          style={{ background: 'var(--accent)' }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          논문 추가
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar papers={papers} view={view} selectedKey={selectedKey} onSelect={handleSelect} />

        {/* 콘텐츠 */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {/* 페이지 타이틀 + 검색 */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{pageTitle[view]}</h1>
            {showSearch && (
              <div className="relative w-56">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ color: 'var(--text-muted)' }}>
                  <circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M8.5 8.5l2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="검색..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>
            )}
          </div>

          {view === 'home' && <HomeView papers={papers} onPaper={handlePaper} onAdd={() => setShowModal(true)} />}
          {view === 'journal' && <JournalView papers={filtered} onPaper={handlePaper} onAdd={() => setShowModal(true)} />}
          {view === 'deepread' && <DeepReadView papers={papers} onPaper={handlePaper} />}
          {view === 'stats' && <StatsView papers={papers} />}

          {(view === 'status' || view === 'tag') && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} className="rounded-2xl overflow-hidden">
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>논문이 없어요</p>
                </div>
              ) : (
                filtered.map((p, i) => (
                  <div key={p.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                    <PaperRow paper={p} onClick={() => handlePaper(p.id)} />
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      {showModal && <AddPaperModal onClose={() => setShowModal(false)} onAdded={load} />}
    </div>
  )
}

// ─── 루트 ───────────────────────────────────────────────────────
export default function Home() {
  return <ThemeProvider><App /></ThemeProvider>
}
