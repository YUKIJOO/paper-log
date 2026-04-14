'use client'

import { useState } from 'react'
import { Paper, PaperStatus } from '@/lib/types'
import { addPaper, generateId } from '@/lib/storage'

interface Props {
  onClose: () => void
  onAdded: () => void
}

const CATEGORIES = ['NLP', 'CV', 'RL', 'ML', 'Multimodal', 'AI Safety', 'Robotics', '기타']

export default function AddPaperModal({ onClose, onAdded }: Props) {
  const [form, setForm] = useState({
    title: '',
    authors: '',
    venue: '',
    year: new Date().getFullYear().toString(),
    url: '',
    abstract: '',
    summary: '',
    category: '',
    status: 'read' as PaperStatus,
    rating: 0,
    tags: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return

    const now = new Date().toISOString()
    const paper: Paper = {
      id: generateId(),
      title: form.title.trim(),
      authors: form.authors.split(',').map(a => a.trim()).filter(Boolean),
      venue: form.venue.trim(),
      year: parseInt(form.year) || new Date().getFullYear(),
      url: form.url.trim(),
      abstract: form.abstract.trim(),
      summary: form.summary.trim(),
      keyContributions: [],
      notes: '',
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
          {/* Title */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              제목 <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="논문 제목을 입력하세요"
              required
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all"
              style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
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
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all"
              style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
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
                className="w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all"
                style={{
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
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
                className="w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all"
                style={{
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
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
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all"
              style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Category + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                카테고리
              </label>
              <select
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all appearance-none"
                style={{
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  color: form.category ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
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
                className="w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all appearance-none"
                style={{
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
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
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none resize-none transition-all"
              style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
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
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all"
              style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
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
