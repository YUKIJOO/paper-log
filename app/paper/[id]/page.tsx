import PaperDetailClient from './PaperDetailClient'

export default async function PaperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PaperDetailClient id={id} />
}
