import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>

export const maxDuration = 120

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

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

    let text: string
    if (isPdf) {
      const parsed = await pdfParse(buffer)
      text = parsed.text.slice(0, 80000)
    } else {
      text = buffer.toString('utf-8').slice(0, 80000)
    }

    const message = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `${PROMPT}\n\n논문 전문:\n${text}`,
        },
      ],
    })

    const raw = message.choices[0]?.message?.content ?? ''
    console.log('Groq raw response:', raw.slice(0, 1000))

    // 마크다운 코드블록 제거 후 JSON 추출
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('JSON 파싱 실패, 응답:', raw.slice(0, 500))
      return NextResponse.json({ error: `AI 응답 파싱에 실패했습니다. 응답: ${raw.slice(0, 200)}` }, { status: 500 })
    }

    let sections
    try {
      sections = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      console.error('JSON.parse 실패:', parseErr, jsonMatch[0].slice(0, 500))
      return NextResponse.json({ error: 'AI 응답 JSON 파싱에 실패했습니다.' }, { status: 500 })
    }
    return NextResponse.json({ sections })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('분석 실패:', msg)
    return NextResponse.json({ error: `분석 실패: ${msg}` }, { status: 500 })
  }
}
