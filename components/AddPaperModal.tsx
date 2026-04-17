'use client'

import { useState, useEffect, useRef } from 'react'
import { Paper, PaperStatus } from '@/lib/types'
import { addPaper, generateId } from '@/lib/storage'

interface Props {
  onClose: () => void
  onAdded: () => void
}

interface SearchResult {
  paperId: string
  title: string
  authors: string
  year: string
  venue: string
  url: string
  abstract: string
}

const CATEGORIES = ['NLP', 'CV', 'RL', 'ML', 'Multimodal', 'AI Safety', 'Robotics', '기타']

async function searchPapers(query: string): Promise<SearchResult[]> {
  const res = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=6&fields=title,authors,year,venue,externalIds,abstract`
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.data ?? []).map((p: {
    paperId: string
    title?: string
    authors?: { name: string }[]
    year?: number
    venue?: string
    externalIds?: { ArXiv?: string; DOI?: string }
    abstract?: string
  }) => {
    const arxivId = p.externalIds?.ArXiv
    const doi = p.externalIds?.DOI
    return {
      paperId: p.paperId,
      title: p.title ?? '',
      authors: (p.authors ?? []).map((a: { name: string }) => a.name).join(', '),
      year: p.year?.toString() ?? '',
      venue: p.venue ?? '',
      url: arxivId ? `https://arxiv.org/abs/${arxivId}` : doi ? `https://doi.org/${doi}` : '',
      abstract: p.abstract ?? '',
    }
  })
}

export default function AddPaperModal({ onClose, onAdded }: Props) {
  const [form, setForm] = useState({
    title: '',
    authors: '',
    venue: '',
    volume: '',
    issue: '',
    year: new Date().getFullYear().toString(),
    url: '',
    abstract: '',
    summary: '',
    category: '',
    status: 'read' as PaperStatus,
    rating: 0,
    tags: '',
  })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selected, setSelected] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 타이핑 시 디바운스 검색
  useEffect(() => {
    if (selected || query.trim().length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const found = await searchPapers(query.trim())
      setResults(found)
      setShowDropdown(found.length > 0)
      setSearching(false)
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, selected])

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (r: SearchResult) => {
    setForm(prev => ({
      ...prev,
      title: r.title || prev.title,
      authors: r.authors || prev.authors,
      year: r.year || prev.year,
      venue: r.venue || prev.venue,
      url: r.url || prev.url,
      abstract: r.abstract || prev.abstract,
    }))
    setQuery(r.title)
    setSelected(true)
    setShowDropdown(false)
    setResults([])
  }

  const handleQueryChange = (v: string) => {
    setQuery(v)
    setForm(prev => ({ ...prev, title: v }))
    setSelected(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    const now = new Date().toISOString()
    const paper: Paper = {
      id: generateId(),
      title: form.title.trim(),
      authors: form.authors.split(',').map(a => a.trim()).filter(Boolean),
      venue: form.venue.trim(),
      volume: form.volume.trim() || undefined,
      issue: form.issue.trim() || undefined,
      year: parseInt(form.year) || new Date().getFullYear(),
      url: form.url.trim(),
      abstract: form.abstract.trim(),
      summary: form.summary.trim(),
      keyContributions: [],
      notes: '',
      introduction: '',
      literatureReview: '',
      method: '',
      results: '',
      discussion: '',
      limitation: '',
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      category: form.category,
      status: form.status,
      rating: form.rating as Paper['rating'],
      readAt: form.status === 'read' ? now : undefined,
      createdAt: now,
      updatedAt: now,
    }
    await addPaper(paper)
    onAdded()
    onClose()
  }

  const set = (key: string, value: string | number) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const inputStyle = {
    background: 'var(--surface-hover)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  }
  const inputClass = 'w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all'
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = 'var(--accent)')
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = 'var(--border)')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        className="w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <h2 style={{ color: 'var(--text-primary)' }} className="font-semibold text-base">
            논문 추가
          </h2>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-muted)' }}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Title 검색 */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              제목 <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <input
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  onFocus={e => {
                    onFocus(e)
                    if (results.length > 0) setShowDropdown(true)
                  }}
                  placeholder="논문 제목을 입력하면 자동으로 검색돼요"
                  required
                  className={inputClass}
                  style={{ ...inputStyle, paddingRight: '2.5rem' }}
                />
                {/* 검색 중 스피너 / 선택 완료 체크 */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {searching ? (
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--text-muted)' }}>
                      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="17" strokeDashoffset="6" />
                    </svg>
                  ) : selected ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: '#10b981' }}>
                      <path d="M2.5 7l3.5 3.5 5.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : query.length >= 2 ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--text-muted)' }}>
                      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M10.5 10.5l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  ) : null}
                </div>
              </div>

              {/* 검색 결과 드롭다운 */}
              {showDropdown && (
                <div
                  className="absolute z-10 w-full mt-1.5 rounded-xl overflow-hidden shadow-xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  {results.map((r, i) => (
                    <button
                      key={r.paperId}
                      type="button"
                      onClick={() => handleSelect(r)}
                      className="w-full text-left px-4 py-3 transition-colors"
                      style={{
                        borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                        background: 'transparent',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <p
                        className="text-sm font-medium leading-snug mb-0.5 line-clamp-2"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {r.title}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {[r.authors.split(',')[0]?.trim() + (r.authors.includes(',') ? ' 외' : ''), r.venue, r.year]
                          .filter(Boolean).join(' · ')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selected && (
              <p className="text-xs mt-1.5" style={{ color: '#10b981' }}>
                정보를 자동으로 채웠어요. 아래에서 확인 후 수정하세요.
              </p>
            )}
          </div>

          {/* Authors */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              저자 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(쉼표로 구분)</span>
            </label>
            <input
              value={form.authors}
              onChange={e => set('authors', e.target.value)}
              placeholder="Vaswani, A., Shazeer, N., ..."
              className={inputClass}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {/* Venue + Year */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                학회 / 저널
              </label>
              <input
                value={form.venue}
                onChange={e => set('venue', e.target.value)}
                placeholder="NeurIPS, ICML, ..."
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                연도
              </label>
              <input
                value={form.year}
                onChange={e => set('year', e.target.value)}
                type="number"
                min="1900"
                max="2099"
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          </div>

          {/* Volume + Issue */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Volume <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(선택)</span>
              </label>
              <input
                value={form.volume}
                onChange={e => set('volume', e.target.value)}
                placeholder="예: 42"
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Issue <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(선택)</span>
              </label>
              <input
                value={form.issue}
                onChange={e => set('issue', e.target.value)}
                placeholder="예: 3"
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          </div>

          {/* URL */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              링크 (ArXiv / DOI)
            </label>
            <input
              value={form.url}
              onChange={e => set('url', e.target.value)}
              placeholder="https://arxiv.org/abs/..."
              className={inputClass}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {/* Abstract */}
          {form.abstract && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Abstract
              </label>
              <textarea
                value={form.abstract}
                onChange={e => set('abstract', e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          )}

          {/* Category + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                카테고리
              </label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className={`${inputClass} appearance-none`}
                style={{ ...inputStyle, color: form.category ? 'var(--text-primary)' : 'var(--text-muted)' }}
                onFocus={onFocus}
                onBlur={onBlur}
              >
                <option value="">선택...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                상태
              </label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className={`${inputClass} appearance-none`}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              >
                <option value="read">읽음</option>
                <option value="reading">읽는 중</option>
                <option value="to-read">읽을 예정</option>
              </select>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              별점
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => set('rating', form.rating === i ? 0 : i)}
                  className="transition-transform hover:scale-110"
                >
                  <svg width="22" height="22" viewBox="0 0 22 22" fill={i <= form.rating ? 'var(--accent)' : 'var(--border)'}>
                    <path d="M11 2l2.09 5.26L18.18 8l-4.27 3.93L15.18 18 11 15.27 6.82 18l1.27-6.07L3.82 8l5.09-.74z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              요약
            </label>
            <textarea
              value={form.summary}
              onChange={e => set('summary', e.target.value)}
              placeholder="이 논문의 핵심 내용을 간략히 적어보세요..."
              rows={3}
              className={`${inputClass} resize-none`}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              태그 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(쉼표로 구분)</span>
            </label>
            <input
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
              placeholder="attention, transformer, language-model"
              className={inputClass}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-70"
              style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
