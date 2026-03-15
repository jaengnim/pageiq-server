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
  return `당신은 대한민국 최고의 이커머스 상세페이지 전문 분석가입니다.
아래 상세페이지 내용을 분석하여 반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

URL: ${url}

페이지 내용:
${pageContent}

분석 기준:
1. 이 페이지가 첫 3초 안에 무엇을 파는지 이해되는가? (주목도)
2. 고객 문제와 관련 있다고 느끼게 하는가? (이해도)
3. 상품이 왜 필요한지 설득하는가? (매력도)
4. 사도 괜찮겠다는 신뢰를 주는가? (신뢰도)
5. 망설이는 이유를 미리 제거하는가? (불안해소도)
6. 지금 사야 할 이유를 주는가? (구매유도력)

JSON 응답 형식:
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
    "confidence": 0
  },
  "modules": {
    "basicInfo": {
      "score": 0,
      "currentState": "현재 상태 한 줄",
      "problem": "문제점 한 줄",
      "improvement": "개선 방향 한 줄",
      "example": "실제 수정 예시"
    },
    "firstHook": {
      "score": 0,
      "currentState": "현재 상태",
      "problem": "문제점",
      "improvement": "개선 방향",
      "example": "실제 수정 예시 카피"
    },
    "targetFit": {
      "score": 0,
      "currentState": "현재 상태",
      "problem": "문제점",
      "improvement": "개선 방향",
      "example": "실제 수정 예시"
    },
    "persuasionStructure": {
      "score": 0,
      "currentState": "현재 상태",
      "problem": "문제점",
      "improvement": "개선 방향",
      "example": "실제 수정 예시"
    },
    "valueProposition": {
      "score": 0,
      "currentState": "현재 상태",
      "problem": "문제점",
      "improvement": "개선 방향",
      "example": "실제 수정 예시"
    },
    "trustElements": {
      "score": 0,
      "currentState": "현재 상태",
      "problem": "문제점",
      "improvement": "개선 방향",
      "example": "실제 수정 예시"
    },
    "anxietyHandling": {
      "score": 0,
      "currentState": "현재 상태",
      "problem": "문제점",
      "improvement": "개선 방향",
      "example": "실제 수정 예시"
    },
    "reviewAnalysis": {
      "score": 0,
      "currentState": "현재 상태",
      "problem": "문제점",
      "improvement": "개선 방향",
      "example": "실제 수정 예시"
    },
    "inquiryAnalysis": {
      "score": 0,
      "currentState": "현재 상태",
      "problem": "문제점",
      "improvement": "개선 방향",
      "example": "실제 수정 예시"
    },
    "visualComposition": {
      "score": 0,
      "currentState": "현재 상태",
      "problem": "문제점",
      "improvement": "개선 방향",
      "example": "실제 수정 예시"
    },
    "conversionElements": {
      "score": 0,
      "currentState": "현재 상태",
      "problem": "문제점",
      "improvement": "개선 방향",
      "example": "실제 수정 예시"
    },
    "inflowPotential": {
      "score": 0,
      "currentState": "현재 상태",
      "problem": "문제점",
      "improvement": "개선 방향",
      "example": "실제 수정 예시"
    }
  },
  "topStrengths": ["강점1", "강점2", "강점3", "강점4", "강점5"],
  "topWeaknesses": ["약점1", "약점2", "약점3", "약점4", "약점5"],
  "urgentFixes": ["우선수정1", "우선수정2", "우선수정3"],
  "oneLinerDiagnosis": "이 페이지의 현재 판매력 한 줄 진단",
  "inflowScenarios": [
    {
      "type": "유입 유형 (예: 검색 유입형)",
      "probability": "높음/중간/낮음",
      "reason": "그렇게 판단한 근거",
      "channel": "구체적 채널 (예: 네이버 쇼핑, 블로그 후기 등)"
    }
  ]
}

모든 점수는 0~100 사이 정수로, 한국어로 작성하세요. JSON만 반환하세요.`;
}

async function callOpenAI(prompt: string, apiKey: string): Promise<AnalysisResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 3000,
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
