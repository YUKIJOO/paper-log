export type PaperStatus = 'to-read' | 'reading' | 'read'

export interface Paper {
  id: string
  title: string
  authors: string[]
  venue: string
  volume?: string
  issue?: string
  year: number
  url: string
  abstract: string
  summary: string
  keyContributions: string[]
  notes: string
  // 6개 섹션
  introduction: string
  literatureReview: string
  method: string
  results: string
  discussion: string
  limitation: string
  tags: string[]
  category: string
  status: PaperStatus
  rating: 0 | 1 | 2 | 3 | 4 | 5
  readAt?: string
  createdAt: string
  updatedAt: string
}
