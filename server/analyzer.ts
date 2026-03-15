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

    // Strip HTML tags but preserve text
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

    // Limit to 8000 chars to fit in context
    return text.slice(0, 8000);
  } catch (err: any) {
    throw new Error(`페이지를 가져오는 데 실패했습니다: ${err.message}`);
  }
}

function buildAnalysisPrompt(url: string, pageContent: string): string {
  return `당신은 대한민국 최고의 이커머스 상세페이지 전문 분석가이자 전환율 최적화(CRO) 전문가입니다.
아래 상세페이지 내용을 3단계(빠른 진단 / 12모듈 상세 진단 / 생성용 진단)로 심층 분석하여 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

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
- 각 모듈의 currentState는 반드시 구체적 수치/증거를 포함해 2~3문장으로 작성하라.
- problem 필드는 '왜 그것이 고객 심리/구매 행동에 문제를 일으키는지' 심층 설명 2~3문장으로 작성하라.
- example 필드는 '기존 → 수정' 형식의 실제 카피 예시를 작성하라. 단순 방향 설명 금지.
- level3.newPageStructure는 PACES 프레임워크(Problem→Agitation→Core solution→Evidence→Stimulus)로 최소 10개 섹션을 구성하라.
- level3.imageDirectionList는 최소 8개 이미지/GIF/영상 지시서를 작성하라.
- topStrengths와 topWeaknesses는 각 5개씩, title+detail 구조로 작성하라.
- urgentFixes는 즉시/단기/중기로 구분해 각 3개 이상, 총 9개 이상 작성하라.
- 모든 점수는 0~100 사이 정수로 작성하라.
- 전체를 한국어로 작성하되, level3.imageDirectionList의 aiPrompt만 영문으로 작성하라.

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
    "persona": "명시적 페르소나 묘사 2~3문장 (이름/나이/직업/생활패턴/고민 포함)",
    "scenarios": ["구체적 구매 시나리오1 (상황+감정+행동)", "시나리오2", "시나리오3"]
  },
  "modules": {
    "basicInfo": {
      "subScores": [{"name": "상품명명확성", "score": 0}, {"name": "가격전달력", "score": 0}, {"name": "옵션이해도", "score": 0}, {"name": "첫인상", "score": 0}],
      "score": 0,
      "currentState": "현재상태 2~3문장 (구체적 수치 포함)",
      "problem": "왜 그것이 문제인지 심층 설명 2~3문장 (고객 심리 기반)",
      "improvement": "구체적 액션 아이템 2~3가지",
      "example": "기존: ○○○ → 수정: ○○○ (전/후 비교 포함)"
    },
    "firstHook": {
      "subScores": [{"name": "설득유형", "score": 0}, {"name": "첫3초체류율", "score": 0}, {"name": "감정공명도", "score": 0}],
      "score": 0,
      "currentState": "현재상태 2~3문장",
      "problem": "심층 문제 설명 2~3문장",
      "improvement": "구체적 액션 아이템",
      "example": "기존 → 수정 형식의 실제 카피"
    },
    "targetFit": {
      "subScores": [{"name": "타깃명확성", "score": 0}, {"name": "페르소나일치도", "score": 0}],
      "score": 0,
      "currentState": "",
      "problem": "",
      "improvement": "",
      "example": ""
    },
    "persuasionStructure": {
      "subScores": [{"name": "Attention", "score": 0}, {"name": "Interest", "score": 0}, {"name": "Desire", "score": 0}, {"name": "Action", "score": 0}, {"name": "Satisfaction", "score": 0}],
      "score": 0,
      "currentState": "",
      "problem": "",
      "improvement": "",
      "example": ""
    },
    "valueProposition": {
      "subScores": [{"name": "혜택전달력", "score": 0}, {"name": "차별점강도", "score": 0}, {"name": "USP명확성", "score": 0}],
      "score": 0,
      "currentState": "",
      "problem": "",
      "improvement": "",
      "example": ""
    },
    "trustElements": {
      "subScores": [{"name": "신뢰요소양", "score": 0}, {"name": "신뢰요소질", "score": 0}, {"name": "시각적활용도", "score": 0}],
      "score": 0,
      "currentState": "",
      "problem": "",
      "improvement": "",
      "example": ""
    },
    "anxietyHandling": {
      "subScores": [{"name": "불안해소율", "score": 0}, {"name": "반박처리수", "score": 0}],
      "score": 0,
      "currentState": "",
      "problem": "",
      "improvement": "",
      "example": ""
    },
    "reviewAnalysis": {
      "subScores": [{"name": "리뷰볼륨", "score": 0}, {"name": "리뷰활용도", "score": 0}, {"name": "재구매신호", "score": 0}],
      "score": 0,
      "currentState": "",
      "problem": "",
      "improvement": "",
      "example": ""
    },
    "inquiryAnalysis": {
      "subScores": [{"name": "질문율", "score": 0}, {"name": "반복질문해소도", "score": 0}],
      "score": 0,
      "currentState": "",
      "problem": "",
      "improvement": "",
      "example": ""
    },
    "visualComposition": {
      "subScores": [{"name": "비주얼전달력", "score": 0}, {"name": "감정전달력", "score": 0}, {"name": "GIF영상활용", "score": 0}],
      "score": 0,
      "currentState": "",
      "problem": "",
      "improvement": "",
      "example": ""
    },
    "conversionElements": {
      "subScores": [{"name": "구매유도력", "score": 0}, {"name": "긴급성", "score": 0}, {"name": "CTA강도", "score": 0}],
      "score": 0,
      "currentState": "",
      "problem": "",
      "improvement": "",
      "example": ""
    },
    "inflowPotential": {
      "subScores": [{"name": "SEO최적화", "score": 0}, {"name": "바이럴가능성", "score": 0}, {"name": "경로다양성", "score": 0}],
      "score": 0,
      "currentState": "",
      "problem": "",
      "improvement": "",
      "example": ""
    }
  },
  "topStrengths": [
    {"title": "강점제목", "detail": "구체적 설명과 수치 근거"},
    {"title": "강점제목2", "detail": "구체적 설명과 수치 근거"},
    {"title": "강점제목3", "detail": "구체적 설명과 수치 근거"},
    {"title": "강점제목4", "detail": "구체적 설명과 수치 근거"},
    {"title": "강점제목5", "detail": "구체적 설명과 수치 근거"}
  ],
  "topWeaknesses": [
    {"title": "약점제목", "detail": "왜 문제인지 심층 설명"},
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
  ],
  "level3": {
    "priorityTable": [
      {"timeframe": "즉시(1주)", "action": "구체적 액션", "expectedEffect": "예상효과"},
      {"timeframe": "단기(2~4주)", "action": "구체적 액션", "expectedEffect": "예상효과"},
      {"timeframe": "중기(1~3개월)", "action": "구체적 액션", "expectedEffect": "예상효과"}
    ],
    "newPageStructure": [
      {"step": "P", "sectionName": "S1 감정 훅", "headline": "핵심 카피", "subCopy": "서브 카피", "visual": "비주얼 설명", "whyNeeded": "이 섹션이 필요한 이유"},
      {"step": "A", "sectionName": "S2 문제 확대", "headline": "", "subCopy": "", "visual": "", "whyNeeded": ""},
      {"step": "C", "sectionName": "S3 핵심 해결책", "headline": "", "subCopy": "", "visual": "", "whyNeeded": ""},
      {"step": "E", "sectionName": "S4 신뢰 증거", "headline": "", "subCopy": "", "visual": "", "whyNeeded": ""},
      {"step": "S", "sectionName": "S5 구매 자극", "headline": "", "subCopy": "", "visual": "", "whyNeeded": ""}
    ],
    "imageDirectionList": [
      {"no": 1, "type": "GIF/이미지/영상", "content": "촬영/제작 내용", "direction": "앵글/방향/길이", "purpose": "목적", "aiPrompt": "DALL-E/Midjourney English prompt"}
    ],
    "coreVariables": {
      "targetCustomer": "타깃 고객 상세 (성별/나이/직업/라이프스타일)",
      "coreProblem": "핵심 문제 상황 (고객이 겪는 구체적 불편/고민)",
      "strongestSellingPoint": "가장 강한 판매 포인트 (경쟁사 대비 차별점)",
      "hesitationReasons": ["망설임이유1", "망설임이유2", "망설임이유3"],
      "trustEvidence": ["신뢰근거1", "신뢰근거2"],
      "reviewHighlights": ["강조리뷰1", "강조리뷰2", "강조리뷰3"],
      "mustShowScenes": ["꼭 보여줄 사용장면1", "장면2", "장면3"],
      "mustHaveFAQ": [{"q": "자주 묻는 질문", "a": "답변"}],
      "toneAndManner": "적합한 톤앤매너 설명 (예: 친근하고 전문적인, 감성적이고 따뜻한)",
      "persuasionStructure": "추천 설득 구조 (PACES/AIDA 등 + 이유)"
    }
  }
}

반드시 위 JSON 구조 전체를 빠짐없이 채워서 응답하세요. JSON만 반환하세요.`;
}

async function callOpenAI(prompt: string, apiKey: string): Promise<AnalysisResult> {
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
      max_tokens: 8000,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API 오류: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI 응답이 비어있습니다");

  return JSON.parse(content) as AnalysisResult;
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
    },
    modules: {
      basicInfo: {
        score: 72,
        currentState: "상품명과 가격은 명확하게 표시되어 있음",
        problem: "옵션 구성이 다소 많아 선택 피로도 유발 가능",
        improvement: "인기 옵션을 상단에 배치하고 추천 표시 추가",
        example: "→ 가장 많이 선택: M사이즈 / 블랙 (추천)",
      },
      firstHook: {
        score: 60,
        currentState: "첫 화면이 제품 단독 컷 중심으로 구성됨",
        problem: "고객 문제 공감 없이 제품 설명으로 바로 시작해 이탈 가능",
        improvement: "첫 3초 안에 타겟 고객의 공감 문구로 시작",
        example: "→ '매일 아침 뭐 입지 고민하셨다면, 이게 답입니다'",
      },
      targetFit: {
        score: 58,
        currentState: "전 연령층을 대상으로 하는 범용적 문구 사용",
        problem: "타겟이 불명확해 아무도 '나를 위한 상품'이라 느끼지 못함",
        improvement: "25~35세 직장 여성에게 맞는 구체적 상황 묘사",
        example: "→ '직장 출근부터 주말 나들이까지 데일리로 입는 그 옷'",
      },
      persuasionStructure: {
        score: 55,
        currentState: "제품 스펙 → 가격 → 리뷰 순서로 구성",
        problem: "문제 공감 없이 스펙 설명이 먼저 나와 설득력 약함",
        improvement: "문제 제기 → 공감 → 해결책 → 스펙 → 신뢰 → CTA 순서로 재구성",
        example: "→ 1섹션: 불편함 공감 / 2섹션: 해결책 제시 / 3섹션: 제품 소개",
      },
      valueProposition: {
        score: 65,
        currentState: "기본적인 제품 특징은 나열되어 있음",
        problem: "특징 나열에 그쳐 '그래서 나에게 뭐가 좋은데?'에 답 없음",
        improvement: "특징이 아니라 고객이 얻는 혜택 중심으로 전환",
        example: "→ '면 100%' → '하루 종일 입어도 피부 자극 없는 소재'",
      },
      trustElements: {
        score: 52,
        currentState: "일부 리뷰와 평점이 표시되어 있음",
        problem: "인증, 수상, 판매 수치 등 객관적 신뢰 요소 부족",
        improvement: "누적 판매량, 재구매율, 인증 마크 등 추가",
        example: "→ '누적 판매 5만 개 돌파 / 재구매율 68%'",
      },
      anxietyHandling: {
        score: 45,
        currentState: "기본적인 교환/환불 안내만 있음",
        problem: "사이즈, 소재, 세탁법 등 구매 전 주요 불안 요소 해소 부족",
        improvement: "자주 묻는 불안 TOP5를 상세페이지 본문에 미리 배치",
        example: "→ 'XL이면 실제 어느 정도 사이즈? → 어깨 48cm / 가슴 110cm 기준'",
      },
      reviewAnalysis: {
        score: 68,
        currentState: "평점 및 리뷰 텍스트 표시됨",
        problem: "리뷰의 강점이 상세페이지 본문에 반영되지 않음",
        improvement: "리뷰 핵심 키워드를 상세페이지 카피에 직접 활용",
        example: "→ 리뷰에서 자주 나오는 '가볍다' → 상세페이지에 '하루 종일 가벼운 착용감' 강조",
      },
      inquiryAnalysis: {
        score: 50,
        currentState: "문의 게시판은 있으나 반복 질문 많음",
        problem: "반복 문의가 많다는 것은 상세페이지 설명이 부족하다는 신호",
        improvement: "자주 묻는 질문 TOP5를 FAQ 섹션으로 추가",
        example: "→ Q. 키 162cm 55kg 기준 사이즈? A. M사이즈 추천 (여유있게 입을 경우 L)",
      },
      visualComposition: {
        score: 63,
        currentState: "제품 단독 컷은 충분하나 라이프스타일 컷 부족",
        problem: "실제 착용 맥락 이미지가 부족해 구매 상상력 제한",
        improvement: "타겟 고객과 비슷한 모델의 실제 사용 장면 추가",
        example: "→ 사무실 출근 컷 / 주말 카페 컷 / 야외 나들이 컷 3가지",
      },
      conversionElements: {
        score: 55,
        currentState: "기본 구매 버튼과 가격 표시 있음",
        problem: "지금 사야 할 이유(긴급성/한정성)가 없어 결정 미룸",
        improvement: "한정 수량 또는 오늘 배송 마감 시간 표시 추가",
        example: "→ '오늘 오후 2시 이전 주문 시 내일 도착 / 현재 재고 23개'",
      },
      inflowPotential: {
        score: 60,
        currentState: "검색 키워드 구조는 기본적으로 갖춰져 있음",
        problem: "블로그나 SNS 유입을 위한 바이럴 요소가 약함",
        improvement: "공유하고 싶은 비주얼 콘텐츠와 스토리 추가",
        example: "→ 전/후 비교 이미지 또는 착용 변신 콘텐츠 추가",
      },
    },
    topStrengths: [
      "가격 표시가 명확하고 할인율이 잘 보임",
      "기본 제품 스펙 정보는 충분히 제공됨",
      "리뷰 평점이 높고 리뷰 수가 신뢰감을 줌",
      "옵션 선택이 비교적 간단하게 구성됨",
      "카테고리 내 검색 키워드가 상품명에 포함됨",
    ],
    topWeaknesses: [
      "첫 화면에서 고객 공감 문구가 없어 이탈 위험 높음",
      "구매 불안(사이즈, 소재, 세탁) 해소 정보 부족",
      "지금 사야 할 이유(긴급성/한정성)가 없음",
      "타겟 고객이 불명확해 누구에게도 강하게 어필 안 됨",
      "신뢰 요소(판매량, 재구매율, 인증)가 부족함",
    ],
    urgentFixes: [
      "첫 화면 훅 문구를 고객 공감형으로 교체",
      "사이즈/소재 관련 불안 해소 섹션 추가",
      "구매 긴급성 요소(오늘 배송, 한정 수량) 추가",
    ],
    oneLinerDiagnosis: "제품 자체는 괜찮지만, 타겟 고객에게 말을 걸지 못하는 상세페이지 — 설명은 있으나 설득이 없다.",
    inflowScenarios: [
      {
        type: "검색 유입형",
        probability: "높음",
        reason: "상품명에 주요 키워드가 포함되어 네이버/쿠팡 내 검색 노출 가능성 높음",
        channel: "네이버 쇼핑 / 쿠팡 내부 검색",
      },
      {
        type: "블로그 후기 유입형",
        probability: "중간",
        reason: "리뷰 수가 많아 블로그 후기 작성자들이 언급할 가능성 있음",
        channel: "네이버 블로그 / 티스토리",
      },
      {
        type: "SNS 바이럴형",
        probability: "낮음",
        reason: "감성 비주얼 콘텐츠 부족으로 SNS 공유 유발 요소 미흡",
        channel: "인스타그램 / 핀터레스트",
      },
    ],
  };
}

export async function analyzePageContent(url: string, apiKey?: string): Promise<AnalysisResult> {
  const key = apiKey || OPENAI_API_KEY;

  if (!key) {
    // No API key: return mock result
    await new Promise((r) => setTimeout(r, 2000)); // simulate delay
    return buildMockResult(url);
  }

  const pageContent = await fetchPageContent(url);
  const prompt = buildAnalysisPrompt(url, pageContent);
  return callOpenAI(prompt, key);
}

export async function analyzeWithContent(url: string, pageContent: string, apiKey?: string): Promise<AnalysisResult> {
  const key = apiKey || OPENAI_API_KEY;
  if (!key) {
    await new Promise((r) => setTimeout(r, 1000));
    return buildMockResult(url);
  }
  const prompt = buildAnalysisPrompt(url, pageContent);
  return callOpenAI(prompt, key);
}
