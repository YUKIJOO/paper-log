export type PaperStatus = 'to-read' | 'reading' | 'read'

export interface Paper {
  id: string
  title: string
  authors: string[]
  venue: string
  year: number
  url: string
  abstract: string
  summary: string
  keyContributions: string[]
  notes: string
  tags: string[]
  category: string
  status: PaperStatus
  rating: 0 | 1 | 2 | 3 | 4 | 5
  readAt?: string
  createdAt: string
  updatedAt: string
}
