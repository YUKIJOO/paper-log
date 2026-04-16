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
  "literatureReview": "논문의 Literature Review(문헌 검토) 파트 전체를 읽고, 논문에 있는 번호 붙은 소제목(예: 2.1, 2.2, 2.3 등)을 그대로 사용하여 섹션을 구성하세요. 소제목 하나도 빠짐없이 모두 포함하세요.\\n\\n각 소제목 아래에 반드시 다음 세 가지를 모두 작성하세요:\\n\\n**[소제목 번호 및 제목]**\\n\\n① 변수 및 개념 설명\\n해당 소제목에서 다루는 핵심 변수나 개념이 무엇인지, 선행 연구에서 어떻게 정의되어 왔는지, 어떤 이론적 근거가 있는지를 3~5문장 이상으로 충분히 설명하세요. 단순 요약이 아니라 내용을 풀어서 서술하세요.\\n\\n② 선행 연구의 주요 주장\\n해당 변수나 개념과 관련하여 기존 연구들이 어떤 결과를 보고했는지, 어떤 논쟁이나 흐름이 있었는지 구체적으로 서술하세요.\\n\\n③ 가설\\n해당 소제목에서 제시된 가설이 있으면 논문 원문에 최대한 가깝게 아래 형식으로 정확히 적으세요. 가설이 여러 개면 모두 포함하세요.\\n\\n> **H1:** (가설 내용을 원문에 가깝게 한국어로 정확히 서술)\\n\\n가설이 없는 소제목은 ③을 생략해도 됩니다.",
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
          content: `당신은 한국어로 학술 논문을 분석하는 전문가입니다. 아래 규칙을 반드시 따르세요.

[언어 규칙 - 절대 준수]
1. 모든 내용은 반드시 순수한 한국어(한글)로 작성합니다.
2. 한자(漢字), 중국어 간체자, 일본어 문자는 절대 사용하지 마세요. 예를 들어 "體驗", "文化", "場所" 같은 한자는 "체험", "문화", "장소"처럼 한글로만 표기하세요.
3. 영어는 고유명사(연구자 이름, 모델명, 통계 기법명 등)와 통계 수치(β, p, t 값 등)에만 허용합니다.
4. 영어 원문을 직역하지 말고, 한국 학술 독자가 자연스럽게 읽을 수 있는 문장으로 작성하세요.

[내용 규칙]
5. 각 섹션은 논문 내용을 충분히 반영하여 구체적이고 상세하게 작성하세요. 단순 나열이나 한 줄 요약은 금지합니다.
6. 논문에 있는 수치, 가설 번호, 변수명은 정확하게 옮기세요.
7. 이해하기 쉬운 명확한 문장으로 작성하세요.`,
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
