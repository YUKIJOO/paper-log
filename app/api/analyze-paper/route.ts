import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// DOMMatrix 폴리필 (pdf-parse 빌드 에러 방지)
if (typeof globalThis.DOMMatrix === 'undefined') {
  (globalThis as Record<string, unknown>).DOMMatrix = class {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(..._args: any[]) {}
  }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const parsed = await pdfParse(buffer)
      text = parsed.text
    } else {
      text = buffer.toString('utf-8')
    }

    const truncated = text.slice(0, 60000)

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `다음은 학술 논문의 전문입니다. 이 논문을 읽고 아래 6개 섹션을 한국어로 상세하게 정리해주세요.

반드시 아래 JSON 형식으로만 응답하세요. JSON 외에 다른 텍스트는 절대 포함하지 마세요.

{
  "introduction": "연구 배경, 목적, 연구 질문 정리 (마크다운 사용 가능)",
  "literatureReview": "관련 선행 연구 및 이론적 배경 정리 (마크다운 사용 가능)",
  "method": "연구 방법론, 실험 설계, 데이터 정리 (마크다운 사용 가능)",
  "results": "주요 실험 결과와 수치 정리 (마크다운 사용 가능)",
  "discussion": "결과 해석, 의미, 실용적 시사점 정리 (마크다운 사용 가능)",
  "limitation": "연구의 한계점과 향후 연구 방향 정리 (마크다운 사용 가능)"
}

논문 전문:
${truncated}`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })

    const sections = JSON.parse(jsonMatch[0])
    return NextResponse.json({ sections })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
