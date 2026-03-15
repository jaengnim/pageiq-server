// Image analyzer using GPT-4o Vision
// Accepts multiple screenshot images and analyzes the full product page

import type { AnalysisResult } from "@shared/schema";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const VISION_SYSTEM_PROMPT = `당신은 한국 이커머스 상세페이지 전문 판매력 분석가입니다.
업로드된 스크린샷 이미지들을 순서대로 보고, 상세페이지 전체를 분석하세요.

분석 목적:
1. 현재 상세페이지의 판매력 진단 (왜 팔리거나 안 팔리는지)
2. 더 나은 상세페이지 제작을 위한 구체적 지시서 생성

이미지에서 반드시 파악할 것:
- 상품명, 가격, 할인율, 옵션 구성
- 첫 화면 훅 (첫 이미지/배너에서 뭘 강조하는지)
- 이미지 내 카피 문구들
- 상세페이지 섹션 구성과 흐름
- 비주얼 퀄리티 (사진 품질, 레이아웃, 색감)
- 리뷰/별점 노출 방식
- CTA 버튼 및 구매 유도 요소
- 신뢰 요소 (인증, 수상, 보증 등)
- 불안 해소 요소 (FAQ, 교환/환불 안내 등)
- 움짤/영상이 있는지 여부

반드시 JSON만 반환하세요 (마크다운 없이):
{
  "basicInfo": {
    "productName": "상품명",
    "price": "가격",
    "discount": "할인율",
    "options": ["옵션1", "옵션2"],
    "category": "카테고리",
    "seller": "판매자",
    "reviewCount": "리뷰수",
    "rating": "평점"
  },
  "scores": {
    "overall": 0-100,
    "attention": 0-100,
    "understanding": 0-100,
    "trust": 0-100,
    "appeal": 0-100,
    "anxietyRelief": 0-100,
    "conversionPower": 0-100
  },
  "target": {
    "gender": "성별",
    "ageGroup": "연령대",
    "occupation": "직업",
    "region": "지역",
    "income": "소득",
    "buyingMotivation": "구매 동기",
    "buyingBarrier": "구매 장벽",
    "confidence": 0-100
  },
  "modules": {
    "basicInfo": { "score": 0-100, "currentState": "", "problem": "", "improvement": "", "example": "" },
    "firstHook": { "score": 0-100, "currentState": "", "problem": "", "improvement": "", "example": "" },
    "targetFit": { "score": 0-100, "currentState": "", "problem": "", "improvement": "", "example": "" },
    "persuasionStructure": { "score": 0-100, "currentState": "", "problem": "", "improvement": "", "example": "" },
    "valueProposition": { "score": 0-100, "currentState": "", "problem": "", "improvement": "", "example": "" },
    "trustElements": { "score": 0-100, "currentState": "", "problem": "", "improvement": "", "example": "" },
    "anxietyHandling": { "score": 0-100, "currentState": "", "problem": "", "improvement": "", "example": "" },
    "reviewAnalysis": { "score": 0-100, "currentState": "", "problem": "", "improvement": "", "example": "" },
    "inquiryAnalysis": { "score": 0-100, "currentState": "", "problem": "", "improvement": "", "example": "" },
    "visualComposition": { "score": 0-100, "currentState": "", "problem": "", "improvement": "", "example": "" },
    "conversionElements": { "score": 0-100, "currentState": "", "problem": "", "improvement": "", "example": "" },
    "inflowPotential": { "score": 0-100, "currentState": "", "problem": "", "improvement": "", "example": "" }
  },
  "topStrengths": ["강점1", "강점2", "강점3", "강점4", "강점5"],
  "topWeaknesses": ["약점1", "약점2", "약점3", "약점4", "약점5"],
  "urgentFixes": ["즉시수정1", "즉시수정2", "즉시수정3"],
  "oneLinerDiagnosis": "이 상세페이지를 한 문장으로 진단",
  "inflowScenarios": [
    { "type": "유입 유형", "probability": "높음/중간/낮음", "reason": "이유", "channel": "채널명" }
  ],
  "visualAnalysis": {
    "firstScreenImpact": "첫 화면 임팩트 분석",
    "imageQuality": "이미지 품질 평가",
    "copyInImages": ["이미지 내 카피1", "카피2"],
    "hasVideo": true/false,
    "hasGif": true/false,
    "layoutFlow": "레이아웃 흐름 분석",
    "colorTone": "색감/톤 분석",
    "mobileOptimized": true/false/null
  }
}`;

export async function analyzeWithImages(
  url: string,
  imageBuffers: Buffer[],
  mimeTypes: string[],
  apiKey?: string
): Promise<AnalysisResult & { visualAnalysis?: any }> {
  const key = apiKey || OPENAI_API_KEY;

  if (!key) {
    return getMockResult();
  }

  // Build image content array for GPT-4o
  const imageContents = imageBuffers.map((buf, i) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:${mimeTypes[i] || "image/png"};base64,${buf.toString("base64")}`,
      detail: "high" as const,
    },
  }));

  const userMessage = `아래는 스마트스토어 상세페이지의 스크린샷입니다. 이미지를 순서대로 보고 전체 상세페이지를 분석해주세요.
상품 URL: ${url || "알 수 없음"}
스크린샷 ${imageBuffers.length}장이 업로드되었습니다.

이미지에 보이는 모든 것 — 텍스트, 이미지 품질, 레이아웃, 카피, 비주얼 구성, 영상/GIF 여부, 리뷰 화면 등을 빠짐없이 분석해주세요.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(120000), // 2분
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 4000,
        messages: [
          { role: "system", content: VISION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userMessage },
              ...imageContents,
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI Vision API 오류: ${errBody}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // JSON 파싱: ```json ... ``` 코드블록 또는 순수 JSON 모두 처리
    let jsonStr = content;
    // 코드블록 제거
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // 중괄호로 시작하는 JSON 추출
    const jsonMatch = jsonStr.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) {
      // JSON이 없는 경우 = GPT가 평문 텍스트로 단순 거절 또는 설명
      throw new Error(`이미지 분석 불가: 상세페이지 화면이 인식되지 않았습니다. GoFullPage 등으로 전체 페이지 스크린샷을 업로드해주세요.`);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[1]);
    } catch (parseErr: any) {
      throw new Error(`이미지 분석 불가: 응답 형식 오류. 다시 시도해주세요.`);
    }

    // GPT가 error/message 필드만 반환한 경우 (이미지 분석 불가 - basicInfo 없음)
    if (!parsed.basicInfo) {
      const reason = parsed.error || parsed.message || "이미지에서 상세페이지를 인식하지 못했습니다";
      throw new Error(`이미지 분석 불가: ${reason}`);
    }

    return parsed as AnalysisResult & { visualAnalysis?: any };
  } catch (err: any) {
    throw new Error(`Vision 분석 오류: ${err.message}`);
  }
}

function getMockResult(): AnalysisResult & { visualAnalysis?: any } {
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
    scores: { overall: 62, attention: 70, understanding: 65, trust: 55, appeal: 68, anxietyRelief: 48, conversionPower: 58 },
    target: {
      gender: "여성",
      ageGroup: "25~35세",
      occupation: "직장인/주부",
      region: "수도권 중심",
      income: "중간 소득",
      buyingMotivation: "실용적이고 가성비 좋은 제품",
      buyingBarrier: "사이즈 선택 어려움, 품질 걱정",
      confidence: 75,
    },
    modules: {
      basicInfo: { score: 72, currentState: "상품명과 가격 명확", problem: "옵션 구성 복잡", improvement: "인기 옵션 상단 배치", example: "→ 가장 많이 선택: M사이즈 / 블랙" },
      firstHook: { score: 60, currentState: "제품 단독 컷 중심", problem: "고객 공감 없이 시작", improvement: "첫 3초 공감 문구로 시작", example: "→ '매일 아침 뭐 입지 고민하셨다면'" },
      targetFit: { score: 58, currentState: "범용적 문구", problem: "타겟 불명확", improvement: "25~35세 직장 여성 상황 묘사", example: "→ '출근부터 주말까지 데일리로'" },
      persuasionStructure: { score: 55, currentState: "스펙→가격→리뷰 순서", problem: "공감 없이 스펙 먼저", improvement: "문제→공감→해결→스펙→신뢰→CTA", example: "→ 1섹션: 불편함 공감" },
      valueProposition: { score: 65, currentState: "기본 특징 나열", problem: "혜택이 아닌 특징만", improvement: "혜택 중심으로 전환", example: "→ '면 100%' → '하루종일 피부 자극 없음'" },
      trustElements: { score: 52, currentState: "일부 리뷰 표시", problem: "객관적 신뢰 요소 부족", improvement: "누적판매량, 재구매율 추가", example: "→ 누적 판매 5만개 돌파" },
      anxietyHandling: { score: 45, currentState: "기본 교환/환불만", problem: "주요 불안 해소 부족", improvement: "불안 TOP5 선제 배치", example: "→ XL 실제 어깨 48cm 기준" },
      reviewAnalysis: { score: 68, currentState: "평점/리뷰 표시", problem: "리뷰 강점 미반영", improvement: "리뷰 키워드 카피 활용", example: "→ '가볍다' → '하루종일 가벼운 착용감'" },
      inquiryAnalysis: { score: 50, currentState: "문의 게시판 있음", problem: "반복 질문 많음", improvement: "FAQ 섹션 추가", example: "→ 키 162cm 55kg 기준 M사이즈" },
      visualComposition: { score: 63, currentState: "제품 단독 컷 충분", problem: "라이프스타일 컷 부족", improvement: "실제 사용 장면 추가", example: "→ 사무실/카페/야외 컷 3가지" },
      conversionElements: { score: 55, currentState: "기본 구매 버튼 있음", problem: "긴급성 없음", improvement: "오늘 배송/한정 수량 표시", example: "→ 오후 2시 이전 주문 시 내일 도착" },
      inflowPotential: { score: 60, currentState: "기본 키워드 구조", problem: "바이럴 요소 약함", improvement: "공유하고 싶은 비주얼 추가", example: "→ 전/후 비교 이미지 추가" },
    },
    topStrengths: ["가격 표시 명확", "할인율 잘 보임", "기본 스펙 정보 충분", "리뷰 평점 높음", "카테고리 키워드 포함"],
    topWeaknesses: ["첫 화면 고객 공감 없음", "구매 불안 해소 부족", "긴급성 없음", "타겟 불명확", "신뢰 요소 부족"],
    urgentFixes: ["첫 화면 훅 문구 교체", "사이즈/소재 불안 해소 섹션", "구매 긴급성 요소 추가"],
    oneLinerDiagnosis: "제품은 괜찮지만 타겟 고객에게 말을 걸지 못하는 상세페이지 — 설명은 있으나 설득이 없다.",
    inflowScenarios: [
      { type: "검색 유입형", probability: "높음", reason: "상품명에 주요 키워드 포함", channel: "네이버 쇼핑" },
      { type: "블로그 후기 유입형", probability: "중간", reason: "리뷰 수 많아 블로거 언급 가능", channel: "네이버 블로그" },
      { type: "SNS 바이럴형", probability: "낮음", reason: "감성 비주얼 부족", channel: "인스타그램" },
    ],
    visualAnalysis: {
      firstScreenImpact: "Mock 분석 — 실제 이미지 업로드 필요",
      imageQuality: "Mock 분석",
      copyInImages: [],
      hasVideo: false,
      hasGif: false,
      layoutFlow: "Mock 분석",
      colorTone: "Mock 분석",
      mobileOptimized: null,
    },
  } as any;
}
