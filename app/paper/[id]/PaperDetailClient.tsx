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

type Tab = 'summary' | 'notes' | 'contributions'

export default function PaperDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const [paper, setPaper] = useState<Paper | null>(null)
  const [tab, setTab] = useState<Tab>('summary')
  const [editing, setEditing] = useState<Tab | null>(null)
  const [draft, setDraft] = useState('')
  const [contributionDraft, setContributionDraft] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    getPaperById(id).then(p => {
      if (!p) { router.push('/'); return }
      setPaper(p)
    })
  }, [id, router])

  if (!paper) return null

  const save = async (patch: Partial<Paper>) => {
    const updated = { ...paper, ...patch, updatedAt: new Date().toISOString() }
    await updatePaper(updated)
    setPaper(updated)
  }

  const handleEditStart = (t: Tab) => {
    if (t === 'contributions') {
      setContributionDraft(paper.keyContributions.join('\n'))
    } else {
      setDraft(t === 'summary' ? paper.summary : paper.notes)
    }
    setEditing(t)
  }

  const handleEditSave = async () => {
    if (editing === 'summary') await save({ summary: draft })
    else if (editing === 'notes') await save({ notes: draft })
    else if (editing === 'contributions') {
      const lines = contributionDraft.split('\n').map(l => l.trim()).filter(Boolean)
      await save({ keyContributions: lines })
    }
    setEditing(null)
  }

  const handleDelete = async () => {
    await deletePaper(paper.id)
    router.push('/')
  }

  const handleRating = (r: number) => {
    save({ rating: (paper.rating === r ? 0 : r) as Paper['rating'] })
  }

  const handleStatus = (s: PaperStatus) => save({ status: s })

  const TABS: { key: Tab; label: string }[] = [
    { key: 'summary', label: '요약' },
    { key: 'contributions', label: '핵심 기여' },
    { key: 'notes', label: '노트' },
  ]

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

          {/* Paper header */}
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            className="rounded-2xl p-7 mb-6"
          >
            {/* Status + Category row */}
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
                <span
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--tag-bg)', color: 'var(--tag-text)' }}
                >
                  {paper.category}
                </span>
              )}

              <span style={{ color: 'var(--text-muted)' }} className="text-xs ml-auto">
                {paper.year}{paper.venue ? ` · ${paper.venue}` : ''}
              </span>
            </div>

            {/* Title */}
            <h1
              style={{ color: 'var(--text-primary)' }}
              className="text-xl font-bold leading-snug mb-3"
            >
              {paper.title}
            </h1>

            {/* Authors */}
            <p style={{ color: 'var(--text-secondary)' }} className="text-sm mb-5">
              {paper.authors.join(', ')}
            </p>

            {/* Rating */}
            <div className="flex items-center gap-1 mb-5">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  onClick={() => handleRating(i)}
                  className="transition-transform hover:scale-110"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill={i <= paper.rating ? 'var(--accent)' : 'var(--border)'}>
                    <path d="M10 2l2.09 5.26 5.43.74-4.27 3.93L14.18 17 10 14.27 5.82 17l1.27-5.07L2.48 8l5.43-.74z" />
                  </svg>
                </button>
              ))}
              {paper.rating > 0 && (
                <span style={{ color: 'var(--text-muted)' }} className="text-xs ml-1">
                  {paper.rating}/5
                </span>
              )}
            </div>

            {/* Tags */}
            {paper.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {paper.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-md"
                    style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Link */}
            {paper.url && (
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                style={{ color: 'var(--accent)' }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7M7 1h4v4M11 1L5.5 6.5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                원문 보기
              </a>
            )}
          </div>

          {/* Tabs */}
          <div
            className="flex gap-1 mb-5 p-1 rounded-xl w-fit"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: tab === t.key ? 'var(--accent)' : 'transparent',
                  color: tab === t.key ? 'white' : 'var(--text-secondary)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            className="rounded-2xl p-7 mb-6"
          >
            {/* Summary */}
            {tab === 'summary' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{ color: 'var(--text-primary)' }} className="font-semibold text-sm">요약</h2>
                  <button
                    onClick={() => editing === 'summary' ? handleEditSave() : handleEditStart('summary')}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      background: editing === 'summary' ? 'var(--accent)' : 'var(--surface-hover)',
                      color: editing === 'summary' ? 'white' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {editing === 'summary' ? '저장' : '편집'}
                  </button>
                </div>
                {editing === 'summary' ? (
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    autoFocus
                    placeholder="이 논문의 핵심 내용을 자유롭게 작성하세요..."
                    rows={10}
                    className="w-full text-sm px-4 py-3 rounded-xl outline-none resize-none"
                    style={{
                      background: 'var(--surface-hover)',
                      border: '1px solid var(--accent)',
                      color: 'var(--text-primary)',
                      lineHeight: '1.7',
                    }}
                  />
                ) : paper.summary ? (
                  <div className="prose-custom text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{paper.summary}</ReactMarkdown>
                  </div>
                ) : (
                  <EmptyPlaceholder onClick={() => handleEditStart('summary')} text="요약을 작성해보세요" />
                )}
              </div>
            )}

            {/* Key Contributions */}
            {tab === 'contributions' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{ color: 'var(--text-primary)' }} className="font-semibold text-sm">핵심 기여</h2>
                  <button
                    onClick={() => editing === 'contributions' ? handleEditSave() : handleEditStart('contributions')}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      background: editing === 'contributions' ? 'var(--accent)' : 'var(--surface-hover)',
                      color: editing === 'contributions' ? 'white' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {editing === 'contributions' ? '저장' : '편집'}
                  </button>
                </div>
                {editing === 'contributions' ? (
                  <div>
                    <p style={{ color: 'var(--text-muted)' }} className="text-xs mb-2">한 줄에 하나씩 입력하세요</p>
                    <textarea
                      value={contributionDraft}
                      onChange={e => setContributionDraft(e.target.value)}
                      autoFocus
                      placeholder={"Self-attention 메커니즘 제안\nRNN 없이 순수 Attention만으로 seq2seq\n병렬 처리로 학습 속도 대폭 향상"}
                      rows={8}
                      className="w-full text-sm px-4 py-3 rounded-xl outline-none resize-none"
                      style={{
                        background: 'var(--surface-hover)',
                        border: '1px solid var(--accent)',
                        color: 'var(--text-primary)',
                        lineHeight: '1.7',
                      }}
                    />
                  </div>
                ) : paper.keyContributions.length > 0 ? (
                  <ul className="space-y-2.5">
                    {paper.keyContributions.map((c, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <span
                          className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                          style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                        >
                          {i + 1}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }} className="text-sm leading-relaxed">{c}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyPlaceholder onClick={() => handleEditStart('contributions')} text="핵심 기여를 정리해보세요" />
                )}
              </div>
            )}

            {/* Notes */}
            {tab === 'notes' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{ color: 'var(--text-primary)' }} className="font-semibold text-sm">노트</h2>
                  <button
                    onClick={() => editing === 'notes' ? handleEditSave() : handleEditStart('notes')}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{
                      background: editing === 'notes' ? 'var(--accent)' : 'var(--surface-hover)',
                      color: editing === 'notes' ? 'white' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {editing === 'notes' ? '저장' : '편집'}
                  </button>
                </div>
                {editing === 'notes' ? (
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    autoFocus
                    placeholder="자유롭게 메모를 남기세요. 마크다운 사용 가능합니다..."
                    rows={12}
                    className="w-full text-sm px-4 py-3 rounded-xl outline-none resize-none"
                    style={{
                      background: 'var(--surface-hover)',
                      border: '1px solid var(--accent)',
                      color: 'var(--text-primary)',
                      lineHeight: '1.7',
                    }}
                  />
                ) : paper.notes ? (
                  <div className="prose-custom text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{paper.notes}</ReactMarkdown>
                  </div>
                ) : (
                  <EmptyPlaceholder onClick={() => handleEditStart('notes')} text="자유롭게 노트를 작성해보세요" />
                )}
              </div>
            )}
          </div>

          {/* Delete */}
          <div className="flex justify-end">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-3">
                <span style={{ color: 'var(--text-secondary)' }} className="text-sm">정말 삭제할까요?</span>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-sm px-3 py-1.5 rounded-lg"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  className="text-sm px-3 py-1.5 rounded-lg text-white"
                  style={{ background: '#ef4444' }}
                >
                  삭제
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                논문 삭제
              </button>
            )}
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}

function EmptyPlaceholder({ onClick, text }: { onClick: () => void; text: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-10 flex flex-col items-center gap-2 rounded-xl transition-colors"
      style={{ border: '2px dashed var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: 'var(--text-muted)' }}>
        <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span style={{ color: 'var(--text-muted)' }} className="text-sm">{text}</span>
    </button>
  )
}
