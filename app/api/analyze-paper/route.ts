import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PROMPT = `이 논문을 읽고 아래 6개 섹션을 한국어로 상세하게 정리해주세요.

반드시 아래 JSON 형식으로만 응답하세요. JSON 외에 다른 텍스트는 절대 포함하지 마세요.

{
  "introduction": "연구 배경, 목적, 연구 질문을 마크다운으로 정리",
  "literatureReview": "관련 선행 연구 및 이론적 배경을 마크다운으로 정리",
  "method": "연구 방법론, 실험 설계, 데이터를 마크다운으로 정리",
  "results": "주요 실험 결과와 수치를 마크다운으로 정리",
  "discussion": "결과 해석, 의미, 실용적 시사점을 마크다운으로 정리",
  "limitation": "연구의 한계점과 향후 연구 방향을 마크다운으로 정리"
}`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf')

    let messageContent: Anthropic.MessageParam['content']

    if (isPdf) {
      // Claude가 PDF를 직접 읽음 (pdf-parse 불필요)
      const base64 = buffer.toString('base64')
      messageContent = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64,
          },
        } as Anthropic.DocumentBlockParam,
        {
          type: 'text',
          text: PROMPT,
        },
      ]
    } else {
      // 텍스트 파일
      const text = buffer.toString('utf-8').slice(0, 50000)
      messageContent = `${PROMPT}\n\n논문 전문:\n${text}`
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: messageContent }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('JSON 파싱 실패, 응답:', raw.slice(0, 500))
      return NextResponse.json({ error: 'AI 응답 파싱에 실패했습니다.' }, { status: 500 })
    }

    const sections = JSON.parse(jsonMatch[0])
    return NextResponse.json({ sections })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('분석 실패:', msg)
    return NextResponse.json({ error: `분석 실패: ${msg}` }, { status: 500 })
  }
}
