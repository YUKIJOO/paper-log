'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ThemeProvider } from '@/components/ThemeProvider'
import Header from '@/components/Header'
import { getPaperById, updatePaper, deletePaper } from '@/lib/storage'
import { Paper, PaperStatus } from '@/lib/types'

const STATUS_COLOR: Record<string, string> = {
  read: 'var(--status-read)',
  reading: 'var(--status-reading)',
  'to-read': 'var(--status-to-read)',
}

type SectionKey = 'introduction' | 'literatureReview' | 'method' | 'results' | 'discussion' | 'limitation'

const SECTIONS: { key: SectionKey; label: string; number: number; placeholder: string }[] = [
  { key: 'introduction', number: 1, label: 'Introduction', placeholder: '연구의 배경, 목적, 연구 질문을 정리하세요...' },
  { key: 'literatureReview', number: 2, label: 'Literature Review', placeholder: '관련 선행 연구들을 정리하세요...' },
  { key: 'method', number: 3, label: 'Method', placeholder: '연구 방법론, 실험 설계, 데이터를 정리하세요...' },
  { key: 'results', number: 4, label: 'Results', placeholder: '주요 실험 결과와 수치를 정리하세요...' },
  { key: 'discussion', number: 5, label: 'Discussion & Implication', placeholder: '결과 해석, 의미, 실용적 시사점을 정리하세요...' },
  { key: 'limitation', number: 6, label: 'Limitation', placeholder: '연구의 한계점과 향후 연구 방향을 정리하세요...' },
]

export default function PaperDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null)
  const [draft, setDraft] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')

  useEffect(() => {
    setLoading(true)
    getPaperById(id).then(p => {
      setPaper(p ?? null)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <ThemeProvider>
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
          <Header />
          <div className="flex items-center justify-center py-40">
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--accent)' }}>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" />
            </svg>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  if (!paper) {
    return (
      <ThemeProvider>
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
          <Header />
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <p style={{ color: 'var(--text-secondary)' }} className="text-sm">논문을 찾을 수 없어요.</p>
            <button
              onClick={() => router.push('/')}
              className="text-sm px-4 py-2 rounded-lg text-white"
              style={{ background: 'var(--accent)' }}
            >
              목록으로
            </button>
          </div>
        </div>
      </ThemeProvider>
    )
  }

  const save = async (patch: Partial<Paper>) => {
    setSaving(true)
    const updated = { ...paper, ...patch, updatedAt: new Date().toISOString() }
    await updatePaper(updated)
    setPaper(updated)
    setSaving(false)
  }

  const handleEditStart = (key: SectionKey) => {
    setDraft(paper[key] as string)
    setActiveSection(key)
  }

  const handleEditSave = async () => {
    if (!activeSection) return
    await save({ [activeSection]: draft })
    setActiveSection(null)
  }

  const handleEditCancel = () => {
    setActiveSection(null)
    setDraft('')
  }

  const handleDelete = async () => {
    await deletePaper(paper.id)
    router.push('/')
  }

  const handleStatus = (s: PaperStatus) => save({ status: s })
  const handleRating = (r: number) => save({ rating: (paper.rating === r ? 0 : r) as Paper['rating'] })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAnalyzing(true)
    setAnalyzeError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/analyze-paper', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? '알 수 없는 오류가 발생했습니다.')
      await save(data.sections)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : '분석에 실패했습니다.')
    } finally {
      setAnalyzing(false)
      e.target.value = ''
    }
  }

  const filledCount = SECTIONS.filter(s => (paper[s.key] as string)?.trim()).length

  return (
    <ThemeProvider>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Header />

        <main className="max-w-3xl mx-auto px-6 py-10">
          {/* Back */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-sm mb-8 transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            목록으로
          </button>

          {/* Paper 헤더 카드 */}
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            className="rounded-2xl p-7 mb-8"
          >
            {/* 상태 + 카테고리 + 연도 */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <select
                value={paper.status}
                onChange={e => handleStatus(e.target.value as PaperStatus)}
                className="text-xs font-medium px-2.5 py-1 rounded-full appearance-none cursor-pointer outline-none"
                style={{
                  background: `${STATUS_COLOR[paper.status]}18`,
                  color: STATUS_COLOR[paper.status],
                  border: `1px solid ${STATUS_COLOR[paper.status]}40`,
                }}
              >
                <option value="read">읽음</option>
                <option value="reading">읽는 중</option>
                <option value="to-read">읽을 예정</option>
              </select>
              {paper.category && (
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}>
                  {paper.category}
                </span>
              )}
              <span style={{ color: 'var(--text-muted)' }} className="text-xs ml-auto">
                {paper.year}{paper.venue ? ` · ${paper.venue}` : ''}
              </span>
            </div>

            {/* 제목 */}
            <h1 style={{ color: 'var(--text-primary)' }} className="text-xl font-bold leading-snug mb-2">
              {paper.title}
            </h1>

            {/* 저자 */}
            {paper.authors.length > 0 && (
              <p style={{ color: 'var(--text-secondary)' }} className="text-sm mb-4">
                {paper.authors.join(', ')}
              </p>
            )}

            {/* 별점 */}
            <div className="flex items-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} onClick={() => handleRating(i)} className="transition-transform hover:scale-110">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill={i <= paper.rating ? 'var(--accent)' : 'var(--border)'}>
                    <path d="M9 2l1.8 4.6 4.7.6-3.7 3.4 1.1 5.4L9 13.5l-3.9 2.5 1.1-5.4L2.5 7.2l4.7-.6z" />
                  </svg>
                </button>
              ))}
            </div>

            {/* 태그 */}
            {paper.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {paper.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-md"
                    style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* 링크 + 진행도 */}
            <div className="flex items-center justify-between mb-5">
              {paper.url ? (
                <a href={paper.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                  style={{ color: 'var(--accent)' }}>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M4.5 2H2a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6.5M6.5 1H10v3.5M10 1L4.5 6.5"
                      stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  원문 보기
                </a>
              ) : <span />}
              <span style={{ color: 'var(--text-muted)' }} className="text-xs">
                {filledCount} / 6 섹션 작성됨
              </span>
            </div>

            {/* AI 분석 */}
            <div
              style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)' }}
              className="rounded-xl p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p style={{ color: 'var(--text-primary)' }} className="text-sm font-medium mb-0.5">
                    AI로 논문 자동 분석
                  </p>
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs">
                    PDF 또는 텍스트 파일을 올리면 6개 섹션을 자동으로 채워드려요
                  </p>
                </div>
                <label
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer transition-opacity hover:opacity-90 whitespace-nowrap flex-shrink-0"
                  style={{ background: analyzing ? 'var(--text-muted)' : 'var(--accent)', pointerEvents: analyzing ? 'none' : 'auto' }}
                >
                  {analyzing ? (
                    <>
                      <svg className="animate-spin" width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <circle cx="6.5" cy="6.5" r="5" stroke="white" strokeWidth="1.5" strokeDasharray="16" strokeDashoffset="6" />
                      </svg>
                      분석 중...
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M6.5 1L8 4.5l3.5.5-2.5 2.5.5 3.5L6.5 9 3 11l.5-3.5L1 5l3.5-.5z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
                      </svg>
                      파일 업로드
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={analyzing}
                  />
                </label>
              </div>
              {analyzeError && (
                <p className="text-xs mt-2" style={{ color: '#ef4444' }}>{analyzeError}</p>
              )}
              {analyzing && (
                <div className="mt-3">
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full animate-pulse"
                      style={{ background: 'var(--accent)', width: '60%' }}
                    />
                  </div>
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1.5">
                    Claude가 논문을 읽고 있어요. 1~2분 정도 소요됩니다...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 6개 섹션 */}
          <div className="space-y-4">
            {SECTIONS.map(section => {
              const content = paper[section.key] as string
              const isEditing = activeSection === section.key
              const isFilled = content?.trim().length > 0

              return (
                <div
                  key={section.key}
                  style={{ background: 'var(--surface)', border: `1px solid ${isEditing ? 'var(--accent)' : 'var(--border)'}` }}
                  className="rounded-2xl overflow-hidden transition-all"
                >
                  {/* 섹션 헤더 */}
                  <div
                    className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: isEditing || isFilled ? '1px solid var(--border)' : 'none' }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: isFilled ? 'var(--accent)' : 'var(--surface-hover)',
                          color: isFilled ? 'white' : 'var(--text-muted)',
                        }}
                      >
                        {section.number}
                      </span>
                      <span style={{ color: 'var(--text-primary)' }} className="font-semibold text-sm">
                        {section.label}
                      </span>
                    </div>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleEditCancel}
                          className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                          style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        >
                          취소
                        </button>
                        <button
                          onClick={handleEditSave}
                          disabled={saving}
                          className="text-xs px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ background: 'var(--accent)' }}
                        >
                          {saving ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditStart(section.key)}
                        className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                      >
                        {isFilled ? '편집' : '작성'}
                      </button>
                    )}
                  </div>

                  {/* 섹션 내용 */}
                  {isEditing ? (
                    <div className="px-6 py-4">
                      <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        autoFocus
                        placeholder={section.placeholder}
                        rows={8}
                        className="w-full text-sm px-4 py-3 rounded-xl outline-none resize-none"
                        style={{
                          background: 'var(--surface-hover)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                          lineHeight: '1.8',
                        }}
                      />
                      <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-2">
                        마크다운 사용 가능 (**굵게**, *기울임*, - 목록 등)
                      </p>
                    </div>
                  ) : isFilled ? (
                    <div className="px-6 py-4 prose-custom text-sm">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ children }) => (
                            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '1.25em 0' }}>
                              <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '0.82rem',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                overflow: 'hidden',
                              }}>{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead style={{ background: 'var(--accent-light)' }}>{children}</thead>
                          ),
                          th: ({ children }) => (
                            <th style={{
                              padding: '10px 14px',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: 'var(--accent)',
                              borderBottom: '1px solid var(--border)',
                              whiteSpace: 'nowrap',
                              fontSize: '0.8rem',
                            }}>{children}</th>
                          ),
                          td: ({ children }) => (
                            <td style={{
                              padding: '9px 14px',
                              color: 'var(--text-secondary)',
                              borderBottom: '1px solid var(--border)',
                              lineHeight: '1.6',
                              verticalAlign: 'top',
                            }}>{children}</td>
                          ),
                          tr: ({ children }) => (
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>{children}</tr>
                          ),
                        }}
                      >{content}</ReactMarkdown>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditStart(section.key)}
                      className="w-full px-6 py-5 flex items-center gap-2 transition-colors text-left"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                        <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span style={{ color: 'var(--text-muted)' }} className="text-sm">
                        {section.placeholder}
                      </span>
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* 삭제 */}
          <div className="flex justify-end mt-8">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-3">
                <span style={{ color: 'var(--text-secondary)' }} className="text-sm">정말 삭제할까요?</span>
                <button onClick={() => setShowDeleteConfirm(false)}
                  className="text-sm px-3 py-1.5 rounded-lg"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  취소
                </button>
                <button onClick={handleDelete}
                  className="text-sm px-3 py-1.5 rounded-lg text-white"
                  style={{ background: '#ef4444' }}>
                  삭제
                </button>
              </div>
            ) : (
              <button onClick={() => setShowDeleteConfirm(true)}
                className="text-xs transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}>
                논문 삭제
              </button>
            )}
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}
