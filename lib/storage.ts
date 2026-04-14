'use client'

import { Paper } from './types'

const STORAGE_KEY = 'paper_log_papers'

export function getPapers(): Paper[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Paper[]
  } catch {
    return []
  }
}

export function savePapers(papers: Paper[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(papers))
}

export function addPaper(paper: Paper): void {
  const papers = getPapers()
  savePapers([paper, ...papers])
}

export function updatePaper(updated: Paper): void {
  const papers = getPapers()
  savePapers(papers.map(p => (p.id === updated.id ? updated : p)))
}

export function deletePaper(id: string): void {
  const papers = getPapers()
  savePapers(papers.filter(p => p.id !== id))
}

export function getPaperById(id: string): Paper | undefined {
  return getPapers().find(p => p.id === id)
}

export function generateId(): string {
  return `paper_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}
