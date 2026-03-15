import type { AnalysisResult } from "@shared/schema";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function fetchPageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{3,}/g, "\n")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();

    return text.slice(0, 8000);
  } catch (err: any) {
    throw new Error(`페이지를 가져오는 데 실패했습니다: ${err.message}`);
  }
}

// ── 1단계 프롬프트: basicInfo, scores, target, modules, topStrengths/Weaknesses, urgentFixes, oneLiner, inflowScenarios ──
function buildStep1Prompt(url: string, pageContent: string): string {
  return `당신은 대한민국 최고의 이커머스 상세페이지 전문 분석가이자 전환율 최적화(CRO) 전문가입니다.
아래 상세페이지 내용을 분석하여 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

URL: ${url}

페이지 내용:
${pageContent}

## 분석 원칙
1. 이 페이지가 첫 3초 안에 무엇을 파는지 이해되는가? (주목도)
2. 고객 문제와 관련 있다고 느끼게 하는가? (이해도)
3. 상품이 왜 필요한지 설득하는가? (매력도)
4. 사도 괜찮겠다는 신뢰를 주는가? (신뢰도)
5. 망설이는 이유를 미리 제거하는가? (불안해소도)
6. 지금 사야 할 이유를 주는가? (구매유도력)

## 작성 규칙 (반드시 준수)
- currentState: 구체적 수치/증거 포함 2~3문장
- problem: 고객 심리/구매 행동에 문제를 일으키는 이유 2~3문장
- example: 반드시 "기존: ○○○ → 수정: ○○○" 형식으로 실제 카피 예시
- topStrengths/topWeaknesses: 각 5개, title+detail 구조
- urgentFixes: timeframe이 "즉시"인 것 3개, "단기"인 것 3개, "중기"인 것 3개, 총 9개
- 모든 점수: 0~100 정수
- subScores 각 항목: 0~100 정수

## JSON 응답 형식
{
  "basicInfo": {
    "productName": "상품명",
    "price": "가격",
    "discount": "할인율 또는 없음",
    "options": ["옵션1", "옵션2"],
    "category": "카테고리",
    "seller": "판매자명",
    "reviewCount": "리뷰 수",
    "rating": "평점"
  },
  "scores": {
    "overall": 0,
    "attention": 0,
    "understanding": 0,
    "trust": 0,
    "appeal": 0,
    "anxietyRelief": 0,
    "conversionPower": 0
  },
  "target": {
    "gender": "여성/남성/중성",
    "ageGroup": "20대 초반~30대 후반 등",
    "occupation": "직업 추정",
    "region": "지역 추정",
    "income": "소득 수준",
    "buyingMotivation": "구매 동기",
    "buyingBarrier": "구매 장벽",
    "confidence": 0,
    "persona": "페르소나 묘사 2~3문장 (이름/나이/직업/생활패턴/고민 포함)",
    "scenarios": ["구체적 구매 시나리오1 (상황+감정+행동)", "시나리오2", "시나리오3"]
  },
  "modules": {
    "basicInfo": {
      "subScores": [{"name": "상품명명확성", "score": 0}, {"name": "가격전달력", "score": 0}, {"name": "옵션이해도", "score": 0}, {"name": "첫인상", "score": 0}],
      "score": 0,
      "currentState": "현재상태 2~3문장 (구체적 수치 포함)",
      "problem": "왜 그것이 문제인지 심층 설명 2~3문장 (고객 심리 기반)",
      "improvement": "구체적 액션 아이템 2~3가지",
      "example": "기존: ○○○ → 수정: ○○○"
    },
    "firstHook": {
      "subScores": [{"name": "설득유형", "score": 0}, {"name": "첫3초체류율", "score": 0}, {"name": "감정공명도", "score": 0}],
      "score": 0, "currentState": "", "problem": "", "improvement": "", "example": ""
    },
    "targetFit": {
      "subScores": [{"name": "타깃명확성", "score": 0}, {"name": "페르소나일치도", "score": 0}],
      "score": 0, "currentState": "", "problem": "", "improvement": "", "example": ""
    },
    "persuasionStructure": {
      "subScores": [{"name": "Attention", "score": 0}, {"name": "Interest", "score": 0}, {"name": "Desire", "score": 0}, {"name": "Action", "score": 0}, {"name": "Satisfaction", "score": 0}],
      "score": 0, "currentState": "", "problem": "", "improvement": "", "example": ""
    },
    "valueProposition": {
      "subScores": [{"name": "혜택전달력", "score": 0}, {"name": "차별점강도", "score": 0}, {"name": "USP명확성", "score": 0}],
      "score": 0, "currentState": "", "problem": "", "improvement": "", "example": ""
    },
    "trustElements": {
      "subScores": [{"name": "신뢰요소양", "score": 0}, {"name": "신뢰요소질", "score": 0}, {"name": "시각적활용도", "score": 0}],
      "score": 0, "currentState": "", "problem": "", "improvement": "", "example": ""
    },
    "anxietyHandling": {
      "subScores": [{"name": "불안해소율", "score": 0}, {"name": "반박처리수", "score": 0}],
      "score": 0, "currentState": "", "problem": "", "improvement": "", "example": ""
    },
    "reviewAnalysis": {
      "subScores": [{"name": "리뷰볼륨", "score": 0}, {"name": "리뷰활용도", "score": 0}, {"name": "재구매신호", "score": 0}],
      "score": 0, "currentState": "", "problem": "", "improvement": "", "example": ""
    },
    "inquiryAnalysis": {
      "subScores": [{"name": "질문율", "score": 0}, {"name": "반복질문해소도", "score": 0}],
      "score": 0, "currentState": "", "problem": "", "improvement": "", "example": ""
    },
    "visualComposition": {
      "subScores": [{"name": "비주얼전달력", "score": 0}, {"name": "감정전달력", "score": 0}, {"name": "GIF영상활용", "score": 0}],
      "score": 0, "currentState": "", "problem": "", "improvement": "", "example": ""
    },
    "conversionElements": {
      "subScores": [{"name": "구매유도력", "score": 0}, {"name": "긴급성", "score": 0}, {"name": "CTA강도", "score": 0}],
      "score": 0, "currentState": "", "problem": "", "improvement": "", "example": ""
    },
    "inflowPotential": {
      "subScores": [{"name": "SEO최적화", "score": 0}, {"name": "바이럴가능성", "score": 0}, {"name": "경로다양성", "score": 0}],
      "score": 0, "currentState": "", "problem": "", "improvement": "", "example": ""
    }
  },
  "topStrengths": [
    {"title": "강점제목1", "detail": "구체적 설명과 수치 근거"},
    {"title": "강점제목2", "detail": "구체적 설명과 수치 근거"},
    {"title": "강점제목3", "detail": "구체적 설명과 수치 근거"},
    {"title": "강점제목4", "detail": "구체적 설명과 수치 근거"},
    {"title": "강점제목5", "detail": "구체적 설명과 수치 근거"}
  ],
  "topWeaknesses": [
    {"title": "약점제목1", "detail": "왜 문제인지 심층 설명"},
    {"title": "약점제목2", "detail": "왜 문제인지 심층 설명"},
    {"title": "약점제목3", "detail": "왜 문제인지 심층 설명"},
    {"title": "약점제목4", "detail": "왜 문제인지 심층 설명"},
    {"title": "약점제목5", "detail": "왜 문제인지 심층 설명"}
  ],
  "urgentFixes": [
    {"action": "즉시 수정 액션1", "expectedEffect": "예상효과", "timeframe": "즉시"},
    {"action": "즉시 수정 액션2", "expectedEffect": "예상효과", "timeframe": "즉시"},
    {"action": "즉시 수정 액션3", "expectedEffect": "예상효과", "timeframe": "즉시"},
    {"action": "단기 수정 액션1", "expectedEffect": "예상효과", "timeframe": "단기"},
    {"action": "단기 수정 액션2", "expectedEffect": "예상효과", "timeframe": "단기"},
    {"action": "단기 수정 액션3", "expectedEffect": "예상효과", "timeframe": "단기"},
    {"action": "중기 수정 액션1", "expectedEffect": "예상효과", "timeframe": "중기"},
    {"action": "중기 수정 액션2", "expectedEffect": "예상효과", "timeframe": "중기"},
    {"action": "중기 수정 액션3", "expectedEffect": "예상효과", "timeframe": "중기"}
  ],
  "oneLinerDiagnosis": "이 페이지의 현재 판매력 한 줄 진단 (구체적 수치와 핵심 문제 포함)",
  "inflowScenarios": [
    {"type": "유입 유형", "probability": "높음/중간/낮음", "reason": "판단 근거", "channel": "구체적 채널"}
  ]
}

반드시 위 JSON 구조 전체를 빠짐없이 채워서 응답하세요. JSON만 반환하세요.`;
}

// ── 2단계 프롬프트: level3 (PACES 기획서 + 이미지 지시서 + coreVariables) ──
function buildStep2Prompt(url: string, pageContent: string, step1Summary: string): string {
  return `당신은 대한민국 최고의 이커머스 상세페이지 기획자입니다.
아래 1단계 분석 결과를 바탕으로, 구매 전환율이 더 높은 새 상세페이지를 설계하세요.
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

URL: ${url}

페이지 내용 요약:
${pageContent.slice(0, 3000)}

1단계 분석 핵심 결과:
${step1Summary}

## 작성 규칙
- newPageStructure: PACES 프레임워크(P→A→C→E→S)로 최소 10개 섹션 구성
  - P(Problem): 고객 문제 공감, A(Agitation): 문제 심화/고통 확대, C(Core solution): 핵심 해결책, E(Evidence): 신뢰 증거, S(Stimulus): 구매 자극
- imageDirectionList: 최소 8개 이미지/GIF/영상 지시서
  - GIF는 제품 사용 과정이나 비교를 보여주는 짧은 루프 영상
  - aiPrompt는 반드시 영문으로 (DALL-E/Midjourney용)
- priorityTable: 즉시/단기/중기 각 3개 이상
- 전체 한국어, aiPrompt만 영문

## JSON 응답 형식
{
  "level3": {
    "priorityTable": [
      {"timeframe": "즉시(1주)", "action": "구체적 액션", "expectedEffect": "예상효과 (예: 전환율 +15%)"},
      {"timeframe": "즉시(1주)", "action": "구체적 액션", "expectedEffect": "예상효과"},
      {"timeframe": "즉시(1주)", "action": "구체적 액션", "expectedEffect": "예상효과"},
      {"timeframe": "단기(2~4주)", "action": "구체적 액션", "expectedEffect": "예상효과"},
      {"timeframe": "단기(2~4주)", "action": "구체적 액션", "expectedEffect": "예상효과"},
      {"timeframe": "단기(2~4주)", "action": "구체적 액션", "expectedEffect": "예상효과"},
      {"timeframe": "중기(1~3개월)", "action": "구체적 액션", "expectedEffect": "예상효과"},
      {"timeframe": "중기(1~3개월)", "action": "구체적 액션", "expectedEffect": "예상효과"},
      {"timeframe": "중기(1~3개월)", "action": "구체적 액션", "expectedEffect": "예상효과"}
    ],
    "newPageStructure": [
      {
        "step": "P",
        "sectionName": "S1 감정 훅",
        "headline": "핵심 카피 (실제 사용 가능한 카피문)",
        "subCopy": "서브 카피 (2~3문장)",
        "visual": "이 섹션에 들어갈 비주얼 설명 (어떤 장면/각도/분위기)",
        "whyNeeded": "이 섹션이 전환율에 미치는 영향 설명"
      },
      {"step": "A", "sectionName": "S2 문제 확대", "headline": "", "subCopy": "", "visual": "", "whyNeeded": ""},
      {"step": "A", "sectionName": "S3 고통 심화", "headline": "", "subCopy": "", "visual": "", "whyNeeded": ""},
      {"step": "C", "sectionName": "S4 핵심 해결책", "headline": "", "subCopy": "", "visual": "", "whyNeeded": ""},
      {"step": "C", "sectionName": "S5 제품 차별점", "headline": "", "subCopy": "", "visual": "", "whyNeeded": ""},
      {"step": "E", "sectionName": "S6 신뢰 증거", "headline": "", "subCopy": "", "visual": "", "whyNeeded": ""},
      {"step": "E", "sectionName": "S7 리뷰/후기", "headline": "", "subCopy": "", "visual": "", "whyNeeded": ""},
      {"step": "E", "sectionName": "S8 불안 해소 FAQ", "headline": "", "subCopy": "", "visual": "", "whyNeeded": ""},
      {"step": "S", "sectionName": "S9 한정 혜택", "headline": "", "subCopy": "", "visual": "", "whyNeeded": ""},
      {"step": "S", "sectionName": "S10 최종 CTA", "headline": "", "subCopy": "", "visual": "", "whyNeeded": ""}
    ],
    "imageDirectionList": [
      {
        "no": 1,
        "type": "GIF/이미지/영상 중 선택",
        "content": "촬영/제작 내용 (무엇을, 어떻게)",
        "direction": "앵글/방향/길이/속도",
        "purpose": "이 비주얼이 전환율에 미치는 목적",
        "aiPrompt": "Detailed English prompt for DALL-E or Midjourney"
      },
      {"no": 2, "type": "", "content": "", "direction": "", "purpose": "", "aiPrompt": ""},
      {"no": 3, "type": "", "content": "", "direction": "", "purpose": "", "aiPrompt": ""},
      {"no": 4, "type": "", "content": "", "direction": "", "purpose": "", "aiPrompt": ""},
      {"no": 5, "type": "", "content": "", "direction": "", "purpose": "", "aiPrompt": ""},
      {"no": 6, "type": "", "content": "", "direction": "", "purpose": "", "aiPrompt": ""},
      {"no": 7, "type": "", "content": "", "direction": "", "purpose": "", "aiPrompt": ""},
      {"no": 8, "type": "", "content": "", "direction": "", "purpose": "", "aiPrompt": ""}
    ],
    "coreVariables": {
      "targetCustomer": "타깃 고객 상세 (성별/나이/직업/라이프스타일)",
      "coreProblem": "핵심 문제 상황 (고객이 겪는 구체적 불편/고민)",
      "strongestSellingPoint": "가장 강한 판매 포인트 (경쟁사 대비 차별점)",
      "hesitationReasons": ["망설임이유1", "망설임이유2", "망설임이유3"],
      "trustEvidence": ["신뢰근거1", "신뢰근거2", "신뢰근거3"],
      "reviewHighlights": ["강조리뷰키워드1", "강조리뷰키워드2", "강조리뷰키워드3"],
      "mustShowScenes": ["꼭 보여줄 사용장면1", "장면2", "장면3"],
      "mustHaveFAQ": [{"q": "자주 묻는 질문1", "a": "답변"}, {"q": "질문2", "a": "답변"}, {"q": "질문3", "a": "답변"}],
      "toneAndManner": "적합한 톤앤매너 (예: 친근하고 전문적인 / 감성적이고 따뜻한)",
      "persuasionStructure": "추천 설득 구조 (PACES/AIDA 등 + 이유)"
    }
  }
}

반드시 위 JSON 구조 전체를 빠짐없이 채워서 응답하세요. JSON만 반환하세요.`;
}

async function callOpenAI(prompt: string, apiKey: string, maxTokens: number = 6000): Promise<any> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API 오류: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  const finishReason = data.choices?.[0]?.finish_reason;
  
  console.log(`[OpenAI] finish_reason: ${finishReason}, tokens: ${JSON.stringify(data.usage)}`);
  
  if (!content) throw new Error("OpenAI 응답이 비어있습니다");

  return JSON.parse(content);
}

async function analyzeInTwoSteps(url: string, pageContent: string, apiKey: string): Promise<AnalysisResult> {
  // 1단계: 기본 분석 + 12모듈
  console.log("[PageIQ] Step1 분석 시작...");
  const step1Result = await callOpenAI(buildStep1Prompt(url, pageContent), apiKey, 6000);
  
  // 1단계 핵심 결과 요약 (2단계 컨텍스트용)
  const step1Summary = JSON.stringify({
    productName: step1Result.basicInfo?.productName,
    scores: step1Result.scores,
    topWeaknesses: step1Result.topWeaknesses,
    topStrengths: step1Result.topStrengths,
    target: {
      persona: step1Result.target?.persona,
      buyingMotivation: step1Result.target?.buyingMotivation,
      buyingBarrier: step1Result.target?.buyingBarrier,
    },
    oneLinerDiagnosis: step1Result.oneLinerDiagnosis,
  });

  // 2단계: level3 PACES 기획서 + 이미지 지시서
  console.log("[PageIQ] Step2 level3 기획서 생성 시작...");
  const step2Result = await callOpenAI(buildStep2Prompt(url, pageContent, step1Summary), apiKey, 6000);

  // 병합
  const merged: AnalysisResult = {
    ...step1Result,
    level3: step2Result.level3,
  };

  return merged;
}

function buildMockResult(url: string): AnalysisResult {
  return {
    basicInfo: {
      productName: "테스트 상품 (Mock 분석)",
      price: "29,900원",
      discount: "15%",
      options: ["S", "M", "L", "XL"],
      category: "의류/패션",
      seller: "테스트 셀러",
      reviewCount: "1,234",
      rating: "4.7",
    },
    scores: {
      overall: 62,
      attention: 70,
      understanding: 65,
      trust: 55,
      appeal: 68,
      anxietyRelief: 48,
      conversionPower: 58,
    },
    target: {
      gender: "여성",
      ageGroup: "25~35세",
      occupation: "직장인/주부",
      region: "수도권 중심",
      income: "중간 소득",
      buyingMotivation: "실용적이고 가성비 좋은 제품을 찾는 구매자",
      buyingBarrier: "사이즈 선택의 어려움, 실제 착용 후 품질 걱정",
      confidence: 75,
      persona: "김지은(32세, 직장 여성)은 매일 아침 출근복 고르는 데 10분 이상 소비하며, SNS에서 발견한 트렌디한 아이템을 합리적인 가격에 사고 싶어한다.",
      scenarios: [
        "퇴근 후 인스타그램 피드에서 비슷한 옷을 발견하고 검색하다 유입",
        "주말 나들이 전날 밤 '데일리룩 추천' 키워드로 검색",
        "친구에게 옷 추천받고 스마트스토어 직접 방문",
      ],
    },
    modules: {
      basicInfo: {
        score: 72,
        currentState: "상품명과 가격은 명확하게 표시되어 있음",
        problem: "옵션 구성이 다소 많아 선택 피로도 유발 가능",
        improvement: "인기 옵션을 상단에 배치하고 추천 표시 추가",
        example: "기존: 옵션 7가지 나열 → 수정: 가장 많이 선택: M사이즈/블랙(추천) 배지 표시",
      },
      firstHook: {
        score: 60,
        currentState: "첫 화면이 제품 단독 컷 중심으로 구성됨",
        problem: "고객 문제 공감 없이 제품 설명으로 바로 시작해 이탈 가능",
        improvement: "첫 3초 안에 타겟 고객의 공감 문구로 시작",
        example: "기존: 제품명+가격 → 수정: '매일 아침 뭐 입지 고민하셨다면, 이게 답입니다'",
      },
      targetFit: {
        score: 58,
        currentState: "전 연령층을 대상으로 하는 범용적 문구 사용",
        problem: "타겟이 불명확해 아무도 '나를 위한 상품'이라 느끼지 못함",
        improvement: "25~35세 직장 여성에게 맞는 구체적 상황 묘사",
        example: "기존: 누구나 편하게 → 수정: '직장 출근부터 주말 나들이까지 데일리로 입는 그 옷'",
      },
      persuasionStructure: {
        score: 55,
        currentState: "제품 스펙 → 가격 → 리뷰 순서로 구성",
        problem: "문제 공감 없이 스펙 설명이 먼저 나와 설득력 약함",
        improvement: "문제 제기 → 공감 → 해결책 → 스펙 → 신뢰 → CTA 순서로 재구성",
        example: "기존: 스펙 나열 → 수정: 1섹션 불편함 공감 / 2섹션 해결책 제시 / 3섹션 제품 소개",
      },
      valueProposition: {
        score: 65,
        currentState: "기본적인 제품 특징은 나열되어 있음",
        problem: "특징 나열에 그쳐 '그래서 나에게 뭐가 좋은데?'에 답 없음",
        improvement: "특징이 아니라 고객이 얻는 혜택 중심으로 전환",
        example: "기존: 면 100% → 수정: '하루 종일 입어도 피부 자극 없는 소재'",
      },
      trustElements: {
        score: 52,
        currentState: "일부 리뷰와 평점이 표시되어 있음",
        problem: "인증, 수상, 판매 수치 등 객관적 신뢰 요소 부족",
        improvement: "누적 판매량, 재구매율, 인증 마크 등 추가",
        example: "기존: 리뷰 나열 → 수정: '누적 판매 5만 개 돌파 / 재구매율 68%' 배지",
      },
      anxietyHandling: {
        score: 45,
        currentState: "기본적인 교환/환불 안내만 있음",
        problem: "사이즈, 소재, 세탁법 등 구매 전 주요 불안 요소 해소 부족",
        improvement: "자주 묻는 불안 TOP5를 상세페이지 본문에 미리 배치",
        example: "기존: 교환/환불 안내만 → 수정: XL이면 실제 어느 정도? 어깨 48cm/가슴 110cm 기준",
      },
      reviewAnalysis: {
        score: 68,
        currentState: "평점 및 리뷰 텍스트 표시됨",
        problem: "리뷰의 강점이 상세페이지 본문에 반영되지 않음",
        improvement: "리뷰 핵심 키워드를 상세페이지 카피에 직접 활용",
        example: "기존: 리뷰 나열 → 수정: 리뷰에서 자주 나오는 '가볍다'를 본문에 '하루 종일 가벼운 착용감' 강조",
      },
      inquiryAnalysis: {
        score: 50,
        currentState: "문의 게시판은 있으나 반복 질문 많음",
        problem: "반복 문의가 많다는 것은 상세페이지 설명이 부족하다는 신호",
        improvement: "자주 묻는 질문 TOP5를 FAQ 섹션으로 추가",
        example: "기존: 문의 게시판만 → 수정: Q. 키 162cm 55kg 기준 사이즈? A. M사이즈 추천",
      },
      visualComposition: {
        score: 63,
        currentState: "제품 단독 컷은 충분하나 라이프스타일 컷 부족",
        problem: "실제 착용 맥락 이미지가 부족해 구매 상상력 제한",
        improvement: "타겟 고객과 비슷한 모델의 실제 사용 장면 추가",
        example: "기존: 흰 배경 제품 컷만 → 수정: 사무실 출근 컷/주말 카페 컷/야외 나들이 컷 3가지",
      },
      conversionElements: {
        score: 55,
        currentState: "기본 구매 버튼과 가격 표시 있음",
        problem: "지금 사야 할 이유(긴급성/한정성)가 없어 결정 미룸",
        improvement: "한정 수량 또는 오늘 배송 마감 시간 표시 추가",
        example: "기존: 구매하기 버튼만 → 수정: '오늘 오후 2시 이전 주문 시 내일 도착 / 현재 재고 23개'",
      },
      inflowPotential: {
        score: 60,
        currentState: "검색 키워드 구조는 기본적으로 갖춰져 있음",
        problem: "블로그나 SNS 유입을 위한 바이럴 요소가 약함",
        improvement: "공유하고 싶은 비주얼 콘텐츠와 스토리 추가",
        example: "기존: 제품 사진만 → 수정: 전/후 비교 이미지 또는 착용 변신 콘텐츠 추가",
      },
    },
    topStrengths: [
      { title: "명확한 가격 표시", detail: "가격과 할인율이 즉시 눈에 들어오는 구조" },
      { title: "기본 스펙 충분 제공", detail: "소재, 사이즈 등 기본 정보는 갖춰져 있음" },
      { title: "높은 리뷰 평점", detail: "4.7점으로 신뢰감 형성에 도움" },
      { title: "간단한 옵션 구성", detail: "선택 피로도가 낮은 편" },
      { title: "검색 키워드 포함 상품명", detail: "네이버 쇼핑 내 검색 노출 가능성 높음" },
    ],
    topWeaknesses: [
      { title: "첫 화면 공감 문구 없음", detail: "고객 감정 연결 없이 제품 설명으로 시작해 이탈률 높음" },
      { title: "구매 불안 해소 부족", detail: "사이즈/소재/세탁 관련 불안 해소 정보 미흡" },
      { title: "긴급성 요소 없음", detail: "지금 사야 할 이유가 없어 구매 결정 미룸" },
      { title: "타겟 불명확", detail: "누구에게나 해당되는 문구로 강한 어필 불가" },
      { title: "신뢰 수치 부족", detail: "판매량, 재구매율 등 객관적 신뢰 지표 없음" },
    ],
    urgentFixes: [
      { action: "첫 화면 훅 문구를 고객 공감형으로 교체", expectedEffect: "3초 이탈률 감소, 스크롤 유도", timeframe: "즉시" },
      { action: "사이즈/소재 불안 해소 섹션 추가", expectedEffect: "구매 장벽 제거, 전환율 +10%", timeframe: "즉시" },
      { action: "구매 긴급성 요소 추가 (오늘 배송/한정 재고)", expectedEffect: "즉시 구매 결정 유도", timeframe: "즉시" },
      { action: "타겟 페르소나 기반 카피 전면 수정", expectedEffect: "타겟 공감도 상승", timeframe: "단기" },
      { action: "누적 판매량/재구매율 배지 추가", expectedEffect: "신뢰도 +20%", timeframe: "단기" },
      { action: "라이프스타일 착용 컷 3종 추가 촬영", expectedEffect: "구매 상상력 자극", timeframe: "단기" },
      { action: "FAQ 섹션 본문 추가 (자주 묻는 질문 TOP5)", expectedEffect: "문의 감소, 전환율 개선", timeframe: "중기" },
      { action: "리뷰 키워드 분석 후 본문 카피에 반영", expectedEffect: "SEO + 신뢰도 동시 개선", timeframe: "중기" },
      { action: "인스타그램/블로그 바이럴 콘텐츠 제작", expectedEffect: "외부 유입 채널 확대", timeframe: "중기" },
    ],
    oneLinerDiagnosis: "제품 자체는 괜찮지만, 타겟 고객에게 말을 걸지 못하는 상세페이지 — 설명은 있으나 설득이 없다.",
    inflowScenarios: [
      { type: "검색 유입형", probability: "높음", reason: "상품명에 주요 키워드 포함", channel: "네이버 쇼핑 / 쿠팡 내부 검색" },
      { type: "블로그 후기 유입형", probability: "중간", reason: "리뷰 수 多, 블로그 언급 가능성", channel: "네이버 블로그 / 티스토리" },
      { type: "SNS 바이럴형", probability: "낮음", reason: "감성 비주얼 콘텐츠 부족", channel: "인스타그램 / 핀터레스트" },
    ],
  };
}

export async function analyzePageContent(url: string, apiKey?: string): Promise<AnalysisResult> {
  const key = apiKey || OPENAI_API_KEY;

  if (!key) {
    await new Promise((r) => setTimeout(r, 2000));
    return buildMockResult(url);
  }

  const pageContent = await fetchPageContent(url);
  return analyzeInTwoSteps(url, pageContent, key);
}

export async function analyzeWithContent(url: string, pageContent: string, apiKey?: string): Promise<AnalysisResult> {
  const key = apiKey || OPENAI_API_KEY;
  if (!key) {
    await new Promise((r) => setTimeout(r, 1000));
    return buildMockResult(url);
  }
  return analyzeInTwoSteps(url, pageContent, key);
}
