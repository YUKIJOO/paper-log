import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Vercel 함수 최대 실행 시간 (초) - Pro 플랜 최대 300초
export const maxDuration = 120

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
    // 1. 파일 수신
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }

    // 2. 텍스트 추출
    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      try {
        const parsed = await pdfParse(buffer)
        text = parsed.text
      } catch (pdfErr) {
        console.error('PDF 파싱 실패:', pdfErr)
        return NextResponse.json({ error: 'PDF 파싱에 실패했습니다. 텍스트 파일(.txt)로 시도해보세요.' }, { status: 400 })
      }
    } else {
      text = buffer.toString('utf-8')
    }

    if (!text.trim()) {
      return NextResponse.json({ error: '파일에서 텍스트를 추출하지 못했습니다.' }, { status: 400 })
    }

    // 3. Claude 분석 (앞 50,000자만 사용)
    const truncated = text.slice(0, 50000)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `다음은 학술 논문의 전문입니다. 이 논문을 읽고 아래 6개 섹션을 한국어로 상세하게 정리해주세요.

반드시 아래 JSON 형식으로만 응답하세요. JSON 외에 다른 텍스트는 절대 포함하지 마세요.

{
  "introduction": "연구 배경, 목적, 연구 질문을 마크다운으로 정리",
  "literatureReview": "관련 선행 연구 및 이론적 배경을 마크다운으로 정리",
  "method": "연구 방법론, 실험 설계, 데이터를 마크다운으로 정리",
  "results": "주요 실험 결과와 수치를 마크다운으로 정리",
  "discussion": "결과 해석, 의미, 실용적 시사점을 마크다운으로 정리",
  "limitation": "연구의 한계점과 향후 연구 방향을 마크다운으로 정리"
}

논문 전문:
${truncated}`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    // 4. JSON 파싱
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('JSON 파싱 실패, AI 응답:', raw.slice(0, 500))
      return NextResponse.json({ error: 'AI 응답 파싱에 실패했습니다.' }, { status: 500 })
    }

    const sections = JSON.parse(jsonMatch[0])
    return NextResponse.json({ sections })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('분석 실패:', message)
    return NextResponse.json({ error: `분석 실패: ${message}` }, { status: 500 })
  }
}
