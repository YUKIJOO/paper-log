import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>

export const maxDuration = 120

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

const PROMPT = `논문을 분석하여 아래 6개 섹션을 한국어로 정리해주세요.
각 섹션은 해당 파트의 내용만 읽고 작성하세요.

반드시 아래 JSON 형식으로만 응답하세요. JSON 외에 다른 텍스트는 절대 포함하지 마세요.

{
  "introduction": "논문의 Introduction 파트를 읽고 아래 두 가지를 중심으로 간결하게 요약하세요:\\n\\n## 왜 이 연구가 필요한가\\n(이 연구가 다루는 문제 상황, 기존 연구의 한계나 공백, 사회적/학문적 필요성을 구체적으로 서술)\\n\\n## 연구의 목적\\n(이 연구가 무엇을 밝히거나 해결하려 하는지, 연구 목적과 핵심 연구 질문을 명확하게 서술)",
  "literatureReview": "논문의 Literature Review 파트를 읽고 아래 구조로 상세하게 정리하세요.\\n\\n논문에 등장하는 소제목을 그대로 사용하여 각 섹션을 구성하세요. 각 소제목 아래에 다음 내용을 포함하세요:\\n\\n1. 해당 소제목에서 다루는 핵심 개념과 이론적 배경을 구체적으로 설명\\n2. 관련 선행 연구들이 어떤 주장을 했는지 서술\\n3. 해당 섹션에서 도출된 가설이 있다면 아래 형식으로 명시\\n\\n**가설 H1:** (가설 내용을 원문에 가깝게 정확히 서술)\\n\\n4. 연구에서 사용되는 주요 변수(독립변수, 종속변수, 조절변수 등)가 언급되면 각 변수의 정의와 역할을 명확히 설명\\n\\n소제목이 없는 경우 논문의 흐름에 따라 자연스럽게 구분하세요.",
  "method": "논문의 Method 파트를 읽고 아래 구조로 상세하게 정리하세요.\\n\\n## 데이터 수집\\n표본 대상(누구를 대상으로 했는지), 표본 크기(N), 데이터 수집 방법(설문, 실험, 인터뷰, 공공데이터 등), 수집 기간 및 절차를 구체적으로 서술하세요.\\n\\n## 측정 도구 및 변수 조작화\\n각 변수(독립변수, 종속변수, 조절변수 등)를 어떻게 측정했는지 설명하세요. 사용한 척도(예: 리커트 5점), 문항 수, 신뢰도(Cronbach α) 등 측정 방법을 구체적으로 서술하세요.\\n\\n## 통계 분석 설계\\n어떤 통계 기법을 사용했는지(예: 다중회귀분석, 구조방정식모형(SEM), t-test, ANOVA 등), 각 분석이 어떤 목적으로 사용되었는지 설명하세요. 사용한 통계 소프트웨어(SPSS, R, AMOS 등)도 포함하세요.\\n\\n## 연구모형\\n논문의 연구모형을 텍스트 도식으로 재구성하세요. 변수 간 관계를 아래 형식으로 표현하세요:\\n\\n    [독립변수] → [종속변수]\\n    [독립변수] × [조절변수] → [종속변수]\\n\\n각 화살표 옆에 해당 경로가 의미하는 관계(예: 정(+)의 영향, 조절 효과)를 간략히 표기하세요.",
  "results": "논문의 Results 파트를 읽고 아래 구조로 자세하게 정리하세요.\\n\\n## 기술통계 및 상관관계\\n주요 변수들의 평균, 표준편차, 상관계수 등 기술통계 결과를 서술하세요. 제시된 경우 다중공선성 검토 결과도 포함하세요.\\n\\n## 가설 검증 결과\\n각 가설별로 검증 결과를 아래 형식으로 명확하게 정리하세요:\\n\\n**가설 H1:** (가설 내용)\\n- 결과: 지지 / 기각\\n- 통계치: β = , t = , p = (논문에 제시된 수치 그대로 기재)\\n- 해석: 결과가 의미하는 바를 한 문장으로 설명\\n\\n가설이 없는 경우 연구 질문별로 동일한 형식으로 정리하세요.\\n\\n## 추가 분석 결과\\n조절 효과, 매개 효과, 사후 분석 등 추가적으로 수행된 분석 결과가 있으면 서술하세요.",
  "discussion": "논문의 Discussion 파트를 읽고 아래 구조로 자세하게 정리하세요.\\n\\n## 이론적 공헌\\n이 연구가 기존 학문 분야에 어떤 이론적 기여를 하는지 구체적으로 서술하세요. 기존 이론을 확장하거나 새로운 시각을 제시하는 부분, 선행 연구와 다른 점, 학술적으로 새롭게 밝혀낸 사실을 중심으로 설명하세요.\\n\\n## 실무적 공헌\\n이 연구의 결과가 실제 현장(기업, 정책, 교육 등)에서 어떻게 활용될 수 있는지 구체적으로 서술하세요. 실무 담당자나 의사결정자에게 어떤 시사점을 주는지, 어떤 실질적인 변화나 적용이 가능한지 설명하세요.",
  "limitation": "논문의 Limitation 파트를 읽고 아래 구조로 간결하게 정리하세요.\\n\\n## 연구의 한계점\\n이 연구가 가진 방법론적·이론적 한계를 항목별로 명확하게 서술하세요. (예: 표본의 대표성, 횡단 연구의 한계, 자기보고식 측정의 문제 등)\\n\\n## 향후 연구 방향\\n저자들이 제안하는 후속 연구 주제나 개선 방향을 구체적으로 서술하세요."
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
      text = parsed.text.slice(0, 15000)
    } else {
      text = buffer.toString('utf-8').slice(0, 15000)
    }

    const message = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 6000,
      messages: [
        {
          role: 'system',
          content: '당신은 학술 논문을 분석하는 전문가입니다. 반드시 자연스럽고 정확한 한국어로 작성하세요. 영어 원문 표현을 그대로 번역하지 말고, 한국 학술 독자가 읽기 편한 문장으로 의역하세요. 오타, 어색한 직역, 불필요한 영어 혼용은 금지입니다.',
        },
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
