'use client'

import { Paper } from './types'
import { supabase } from './supabase'

function rowToPaper(row: Record<string, unknown>): Paper {
  return {
    id: row.id as string,
    title: row.title as string,
    authors: (row.authors as string[]) ?? [],
    venue: (row.venue as string) ?? '',
    year: (row.year as number) ?? new Date().getFullYear(),
    url: (row.url as string) ?? '',
    abstract: (row.abstract as string) ?? '',
    summary: (row.summary as string) ?? '',
    keyContributions: (row.key_contributions as string[]) ?? [],
    notes: (row.notes as string) ?? '',
    introduction: (row.introduction as string) ?? '',
    literatureReview: (row.literature_review as string) ?? '',
    method: (row.method as string) ?? '',
    results: (row.results as string) ?? '',
    discussion: (row.discussion as string) ?? '',
    limitation: (row.limitation as string) ?? '',
    tags: (row.tags as string[]) ?? [],
    category: (row.category as string) ?? '',
    status: (row.status as Paper['status']) ?? 'to-read',
    rating: (row.rating as Paper['rating']) ?? 0,
    readAt: row.read_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function paperToRow(paper: Paper) {
  return {
    id: paper.id,
    title: paper.title,
    authors: paper.authors,
    venue: paper.venue,
    year: paper.year,
    url: paper.url,
    abstract: paper.abstract,
    summary: paper.summary,
    key_contributions: paper.keyContributions,
    notes: paper.notes,
    introduction: paper.introduction,
    literature_review: paper.literatureReview,
    method: paper.method,
    results: paper.results,
    discussion: paper.discussion,
    limitation: paper.limitation,
    tags: paper.tags,
    category: paper.category,
    status: paper.status,
    rating: paper.rating,
    read_at: paper.readAt ?? null,
    created_at: paper.createdAt,
    updated_at: paper.updatedAt,
  }
}

export async function getPapers(): Promise<Paper[]> {
  const { data, error } = await supabase
    .from('papers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error(error); return [] }
  return (data ?? []).map(rowToPaper)
}

export async function addPaper(paper: Paper): Promise<void> {
  const { error } = await supabase.from('papers').insert(paperToRow(paper))
  if (error) console.error(error)
}

export async function updatePaper(paper: Paper): Promise<void> {
  const { error } = await supabase
    .from('papers')
    .update(paperToRow(paper))
    .eq('id', paper.id)
  if (error) console.error(error)
}

export async function deletePaper(id: string): Promise<void> {
  const { error } = await supabase.from('papers').delete().eq('id', id)
  if (error) console.error(error)
}

export async function getPaperById(id: string): Promise<Paper | undefined> {
  const { data, error } = await supabase
    .from('papers')
    .select('*')
    .eq('id', id)
    .single()
  if (error) { console.error(error); return undefined }
  return data ? rowToPaper(data) : undefined
}

export function generateId(): string {
  return `paper_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}
