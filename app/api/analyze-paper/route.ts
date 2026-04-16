import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>

export const maxDuration = 120

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_INSTRUCTION = `당신은 한국어로 학술 논문을 분석하는 전문가입니다. 아래 규칙을 반드시 따르세요.

[언어 규칙 - 절대 준수]
1. 모든 내용은 반드시 순수한 한국어(한글)로 작성합니다.
2. 한자(漢字), 중국어 간체자, 일본어 문자는 절대 사용하지 마세요. "體驗"→"체험", "文化"→"문화" 처럼 반드시 한글로 표기하세요.
3. 영어는 고유명사(연구자 이름, 모델명, 통계 기법명)와 통계 수치(β, p, t 값)에만 허용합니다.
4. 영어 원문을 직역하지 말고 한국 학술 독자가 자연스럽게 읽을 수 있는 문장으로 작성하세요.

[내용 규칙]
5. 각 섹션은 논문 내용을 충분히 반영하여 구체적이고 상세하게 작성하세요. 단순 나열이나 한 줄 요약은 금지입니다.
6. 논문에 있는 수치, 가설 번호, 변수명은 정확하게 옮기세요.
7. 이해하기 쉬운 명확한 문장으로 작성하세요.`

const PROMPT = `위 논문을 분석하여 아래 6개 섹션을 한국어로 정리해주세요.

반드시 아래 JSON 형식으로만 응답하세요. JSON 외에 다른 텍스트는 절대 포함하지 마세요.

{
  "introduction": "논문의 Introduction 파트를 읽고 아래 구조로 상세하게 작성하세요.\\n\\n## 연구 배경 및 문제 제기\\n이 연구가 다루는 현상이나 문제가 무엇인지, 왜 지금 이 시점에 중요한지 사회적·학문적 맥락과 함께 구체적으로 서술하세요. 관련 통계나 현황 수치가 있으면 포함하세요.\\n\\n## 기존 연구의 한계\\n선행 연구들이 이 문제를 어떻게 다뤄왔는지, 어떤 부분이 충분히 연구되지 않았거나 모순이 있는지 구체적으로 서술하세요.\\n\\n## 연구 목적 및 연구 질문\\n이 연구가 무엇을 밝히거나 해결하려 하는지, 핵심 연구 목적과 연구 질문(또는 가설)을 명확하게 서술하세요.\\n\\n## 연구의 기여\\n이 연구가 학문적으로나 실무적으로 어떤 새로운 기여를 할 것으로 기대되는지 서술하세요.",

  "literatureReview": "논문의 Literature Review 파트 전체를 아래 지침에 따라 빠짐없이 정확하게 정리하세요.\\n\\n---\\n\\n논문에 실제로 존재하는 번호 붙은 소제목(2.1, 2.2, 2.3 등)을 원문 그대로 사용하여 각 섹션을 구성하세요. 소제목을 임의로 만들거나 변형하지 마세요.\\n\\n각 소제목은 아래 형식으로 작성하세요:\\n\\n## [번호] [소제목 원문]\\n\\n**개념 정의 및 이론적 배경**\\n이 소제목에서 다루는 핵심 개념·변수가 무엇인지, 어떻게 정의되는지, 어떤 이론에 근거하는지를 논문 내용을 바탕으로 최소 4문장 이상 상세하게 서술하세요.\\n\\n**선행 연구 검토**\\n이 개념·변수와 관련된 주요 선행 연구들의 주장, 연구 결과, 상반된 견해 등을 구체적으로 서술하세요. 연구자 이름이나 연도가 언급되면 포함하세요.\\n\\n[가설이 원문에 명시된 경우에만 아래 형식으로 추가 — 없으면 생략]\\n> **H1:** 가설 내용을 원문에 최대한 가깝게 한국어로 번역\\n\\n---\\n\\n모든 소제목 작성 후, 마지막에 아래 가설 요약 표를 추가하세요 (가설이 있는 경우에만):\\n\\n## 가설 요약\\n\\n| 가설 | 내용 | 독립변수 → 종속변수 |\\n|------|------|-------------------|\\n| H1 | 가설 내용 요약 | 변수A → 변수B |",

  "method": "논문의 Method 파트를 읽고 아래 구조로 상세하게 정리하세요.\\n\\n## 연구 설계 개요\\n이 연구가 어떤 유형의 연구인지(양적/질적, 횡단/종단, 실험/설문 등)와 전체적인 연구 설계의 흐름을 간략히 서술하세요.\\n\\n## 데이터 수집\\n- **표본 대상:** 누구를 대상으로 했는지 (산업군, 직군, 연령대 등 구체적으로)\\n- **표본 크기:** 최종 분석에 사용된 표본 수 (N = )\\n- **수집 방법:** 설문지, 실험, 인터뷰, 공공데이터 등 구체적 방법\\n- **수집 절차:** 어떤 과정으로 수집했는지 (온라인/오프라인, 기간 등)\\n- **표본 특성:** 응답자의 인구통계학적 특성 요약\\n\\n## 측정 도구 및 변수 조작화\\n각 변수를 아래 표 형식으로 정리하세요:\\n\\n| 변수 | 유형 | 측정 방법 | 문항 수 | 척도 | 신뢰도(α) |\\n|------|------|----------|--------|------|---------|\\n| 변수명 | 독립/종속/조절/매개 | 측정 방법 | N개 | 리커트 N점 | .XX |\\n\\n## 통계 분석 방법\\n사용한 통계 기법과 각 기법의 목적을 구체적으로 서술하세요. 사용 소프트웨어(SPSS, R, AMOS, SmartPLS 등)도 포함하세요.\\n\\n## 연구모형 도식\\n논문의 연구모형을 아래 형식의 텍스트 다이어그램으로 재구성하세요. 들여쓰기(공백 4칸)를 사용하여 작성하세요:\\n\\n    [독립변수명] ──H1(+)──▶ [종속변수명]\\n    [독립변수명] ──H2(+)──▶ [종속변수명]\\n    [조절변수명] ──(조절)──▶ [독립변수→종속변수 경로]\\n\\n실제 논문의 모든 변수와 가설 경로를 빠짐없이 포함하여 작성하세요.",

  "results": "논문의 Results 파트를 읽고 아래 구조로 빠짐없이 상세하게 정리하세요.\\n\\n## 측정 모형 검증\\n확인적 요인분석(CFA), 신뢰도, 타당도(수렴타당도·판별타당도) 검증 결과가 있으면 서술하세요.\\n\\n## 기술통계 및 상관관계\\n주요 변수들의 평균(M), 표준편차(SD), 상관계수를 아래 표 형식으로 정리하세요:\\n\\n| 변수 | M | SD | 1 | 2 | 3 |\\n|------|---|----|----|---|---|\\n| 변수1 | | | 1 | | |\\n| 변수2 | | | | 1 | |\\n\\n## 가설 검증 결과\\n각 가설을 아래 표로 먼저 요약한 후, 각 결과를 상세히 설명하세요:\\n\\n| 가설 | 내용 | β | t/F값 | p값 | 결과 |\\n|------|------|---|-------|-----|------|\\n| H1 | 내용 | .XX | X.XX | .XXX | 지지/기각 |\\n\\n각 가설별 상세 설명:\\n**H1 검증:**\\n- 통계 결과: (수치 그대로)\\n- 해석: (결과의 의미를 2~3문장으로 설명)\\n\\n## 추가 분석\\n조절 효과, 매개 효과, 사후 분석 등 추가 분석 결과를 서술하세요.",

  "discussion": "논문의 Discussion 파트를 읽고 아래 구조로 상세하게 정리하세요.\\n\\n## 주요 결과 요약\\n이 연구에서 밝혀진 핵심 발견을 간략히 정리하고, 연구 목적과 어떻게 연결되는지 서술하세요.\\n\\n## 이론적 공헌\\n이 연구가 기존 학문에 어떤 이론적 기여를 하는지 항목별로 구체적으로 서술하세요.\\n- 어떤 기존 이론을 확장하거나 검증했는지\\n- 선행 연구와 일치하거나 상반되는 결과가 있는지, 그 이유는 무엇인지\\n- 새롭게 제안하는 이론적 프레임워크나 관계가 있는지\\n\\n## 실무적 공헌\\n연구 결과가 실제 현장에서 어떻게 활용될 수 있는지 대상별로 구체적으로 서술하세요.\\n- 기업/조직 관리자에게 주는 시사점\\n- 정책 입안자에게 주는 시사점 (해당하는 경우)\\n- 현장 적용 방안과 기대 효과",

  "limitation": "논문의 Limitation 파트를 읽고 아래 구조로 정리하세요.\\n\\n## 연구의 한계점\\n아래 항목별로 이 연구의 한계를 명확하게 서술하세요:\\n\\n1. **표본의 한계:** 표본의 대표성, 특정 집단이나 지역에 한정된 문제\\n2. **방법론적 한계:** 횡단 연구, 자기보고식 측정, 동일방법편의 등\\n3. **변수 및 측정의 한계:** 포함되지 않은 변수, 측정 방식의 한계\\n4. **일반화의 한계:** 연구 결과를 다른 맥락에 적용하기 어려운 이유\\n\\n## 향후 연구 방향\\n저자들이 제안하는 후속 연구 주제와 개선 방향을 항목별로 구체적으로 서술하세요."
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
      text = parsed.text.slice(0, 60000)
    } else {
      text = buffer.toString('utf-8').slice(0, 60000)
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 8000,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: `${PROMPT}\n\n논문 전문:\n${text}` },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? ''
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: `AI 응답 파싱에 실패했습니다. 응답: ${raw.slice(0, 200)}` }, { status: 500 })
    }

    let sections
    try {
      sections = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ error: 'AI 응답 JSON 파싱에 실패했습니다.' }, { status: 500 })
    }
    return NextResponse.json({ sections })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `분석 실패: ${msg}` }, { status: 500 })
  }
}
