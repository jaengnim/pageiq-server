import type { AnalysisResult } from "@shared/schema";
import type { ExternalSearchData } from "./external-search";

export interface ImprovementGuide {
  summary: string; // 왜 이 가이드가 현재보다 나은지 한 줄
  targetPersona: {
    description: string;
    painPoints: string[];
    desiredOutcome: string;
    toneAndManner: string;
  };
  pageStructure: PageSection[];
  copywriting: CopyGuide;
  visualGuide: VisualGuide;
  differenceFromOriginal: string[]; // 기존 대비 개선 포인트
}

export interface PageSection {
  order: number;
  sectionName: string;
  purpose: string; // 이 섹션의 목적
  contentDescription: string; // 어떤 내용을 담아야 하는지
  copyExample: string; // 실제 카피 예시
  visualNeeded: VisualItem[];
  whyImproved: string; // 기존 대비 왜 나은지
}

export interface VisualItem {
  type: "image" | "gif" | "video";
  description: string; // 어떤 장면/내용의 비주얼인가
  aiImagePrompt: string; // DALL-E / Midjourney 프롬프트
  aiVideoPrompt?: string; // 영상/GIF용 프롬프트
  size: string; // 권장 사이즈
  priority: "필수" | "권장" | "선택";
}

export interface CopyGuide {
  mainHeadline: string;
  subHeadline: string;
  keyBenefits: string[];
  ctaText: string;
  faqItems: { question: string; answer: string }[];
  trustStatement: string;
}

export interface VisualGuide {
  colorPalette: string[];
  fontStyle: string;
  imageTone: string;
  overallMood: string;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function buildImprovementPrompt(
  analysis: AnalysisResult,
  externalData: ExternalSearchData | null
): string {
  const externalSummary = externalData ? `
외부 데이터 요약:
- 네이버 블로그 포스팅 수: ${externalData.naver?.totalBlogCount || "미수집"}
- 카페 공구 감지: ${externalData.naver?.isGroupBuyDetected ? "있음 (" + externalData.naver.groupBuyKeywords.join(", ") + ")" : "없음"}
- 협찬/광고 리뷰 비율 높음: ${externalData.naver?.isPaidReviewDetected ? "예" : "아니오"}
- 유튜브 리뷰 영상 수: ${externalData.youtube?.totalCount || "미수집"}
- 유튜브 조회수 10만 이상 영상: ${externalData.youtube?.hasHighViewVideo ? "있음" : "없음"}
- 인스타그램 바이럴 가능성: ${externalData.instagram?.viralPossibility || "미수집"}
` : "";

  return `당신은 대한민국 최고의 이커머스 상세페이지 기획자입니다.
아래 분석 결과를 바탕으로 기존보다 훨씬 나은 상세페이지 제작 가이드를 JSON 형식으로만 작성하세요.

분석 결과 요약:
- 상품명: ${analysis.basicInfo.productName}
- 전환력 점수: ${analysis.scores.overall}/100
- 핵심 문제: ${analysis.urgentFixes.join(" / ")}
- 타겟: ${analysis.target.gender} ${analysis.target.ageGroup} ${analysis.target.occupation}
- 구매 동기: ${analysis.target.buyingMotivation}
- 구매 장벽: ${analysis.target.buyingBarrier}
- 첫 화면 훅 문제: ${analysis.modules.firstHook.problem}
- 신뢰 요소 문제: ${analysis.modules.trustElements.problem}
- 불안 해소 문제: ${analysis.modules.anxietyHandling.problem}
${externalSummary}

아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):

{
  "summary": "기존보다 나은 이유 한 줄 요약",
  "targetPersona": {
    "description": "타겟 고객 상세 묘사 (나이/직업/라이프스타일)",
    "painPoints": ["불편함1", "불편함2", "불편함3"],
    "desiredOutcome": "이 상품을 통해 얻고 싶은 결과",
    "toneAndManner": "페이지 전체 톤앤매너 (예: 따뜻하고 공감적인 / 전문적이고 신뢰감 있는)"
  },
  "pageStructure": [
    {
      "order": 1,
      "sectionName": "섹션 이름",
      "purpose": "이 섹션의 목적",
      "contentDescription": "담아야 할 내용 상세 설명",
      "copyExample": "실제 카피 문구 예시 (한국어)",
      "visualNeeded": [
        {
          "type": "image",
          "description": "어떤 장면의 이미지가 필요한지 구체적 설명",
          "aiImagePrompt": "DALL-E 또는 Midjourney용 영문 프롬프트",
          "size": "1200x800px",
          "priority": "필수"
        }
      ],
      "whyImproved": "기존 대비 이 섹션이 왜 더 나은지"
    }
  ],
  "copywriting": {
    "mainHeadline": "메인 헤드라인 카피",
    "subHeadline": "서브 헤드라인 카피",
    "keyBenefits": ["핵심 혜택1", "핵심 혜택2", "핵심 혜택3"],
    "ctaText": "구매 버튼 문구",
    "faqItems": [
      {"question": "자주 묻는 질문1", "answer": "답변1"},
      {"question": "자주 묻는 질문2", "answer": "답변2"},
      {"question": "자주 묻는 질문3", "answer": "답변3"}
    ],
    "trustStatement": "신뢰 강화 문구"
  },
  "visualGuide": {
    "colorPalette": ["색상1 설명", "색상2 설명", "색상3 설명"],
    "fontStyle": "추천 폰트 스타일",
    "imageTone": "이미지 전체 톤 (예: 따뜻한 자연광, 밝고 화사한)",
    "overallMood": "전체 분위기"
  },
  "differenceFromOriginal": [
    "기존 대비 개선 포인트1",
    "기존 대비 개선 포인트2",
    "기존 대비 개선 포인트3",
    "기존 대비 개선 포인트4",
    "기존 대비 개선 포인트5"
  ]
}

섹션은 최소 7개 이상 구성하고, 각 섹션에 visualNeeded를 최소 1개 이상 포함하세요.
모든 내용은 한국어로, aiImagePrompt만 영문으로 작성하세요. JSON만 반환하세요.`;
}

async function callOpenAIForImprovement(prompt: string, apiKey: string): Promise<ImprovementGuide> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 4000,
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
  if (!content) throw new Error("OpenAI 응답이 비어있습니다");
  return JSON.parse(content) as ImprovementGuide;
}

function buildMockImprovementGuide(analysis: AnalysisResult): ImprovementGuide {
  const productName = analysis.basicInfo.productName;
  return {
    summary: "고객 공감에서 시작해 신뢰로 끝나는 구조로 전환 — 설명 중심에서 설득 중심으로 전면 재설계",
    targetPersona: {
      description: `${analysis.target.ageGroup} ${analysis.target.gender} ${analysis.target.occupation}. 바쁜 일상 속 실용적이고 믿을 수 있는 선택을 원함.`,
      painPoints: [
        analysis.target.buyingBarrier,
        "상세페이지를 봐도 내 상황에 맞는지 확신이 없음",
        "비슷한 상품이 많아 어떤 것이 진짜 좋은지 모름",
      ],
      desiredOutcome: analysis.target.buyingMotivation,
      toneAndManner: "따뜻하고 공감적인 톤, 과장 없이 진정성 있게",
    },
    pageStructure: [
      {
        order: 1,
        sectionName: "공감 훅 배너",
        purpose: "타겟 고객의 현실적 불편함을 첫 문장으로 정확히 짚어 '나를 위한 상품'임을 인식시킴",
        contentDescription: "고객이 겪는 구체적 상황을 묘사하는 짧고 강한 문구 + 해결책 암시",
        copyExample: `"매일 같은 고민, 오늘은 다릅니다"\n${productName}이 그 답이 됩니다.`,
        visualNeeded: [
          {
            type: "image",
            description: "타겟 고객과 동일한 연령대/성별 모델이 일상적 불편을 겪다가 표정이 밝아지는 비포/애프터 장면",
            aiImagePrompt: `Korean ${analysis.target.gender === "여성" ? "woman" : "man"} in their ${analysis.target.ageGroup}, lifestyle photography, warm natural lighting, before-after concept, cozy home setting, soft beige tones, high quality, realistic`,
            size: "1200x600px",
            priority: "필수",
          },
        ],
        whyImproved: "기존은 제품 단독 컷으로 시작해 고객 공감이 없었음. 타겟 상황을 직접 묘사해 이탈률 감소",
      },
      {
        order: 2,
        sectionName: "핵심 혜택 3가지",
        purpose: "스펙이 아닌 고객이 얻는 실제 혜택을 아이콘+짧은 문구로 빠르게 전달",
        contentDescription: "3가지 핵심 혜택을 각각 한 줄로 표현. 기능→혜택으로 변환해서 작성",
        copyExample: `✓ 하루 종일 편안함 — 피부 자극 없는 소재\n✓ 어디서든 자신 있게 — 상황을 가리지 않는 디자인\n✓ 오래 써도 처음처럼 — 검증된 내구성`,
        visualNeeded: [
          {
            type: "image",
            description: "3가지 혜택을 상징하는 아이콘 또는 인포그래픽 이미지",
            aiImagePrompt: "Clean minimalist infographic with 3 benefit icons, Korean lifestyle product, white background, teal and warm beige color scheme, modern flat design",
            size: "1200x400px",
            priority: "필수",
          },
        ],
        whyImproved: "기존은 스펙 나열이었음. 혜택 중심으로 전환해 '그래서 나에게 뭐가 좋은데?'에 즉시 답변",
      },
      {
        order: 3,
        sectionName: "실제 사용 장면",
        purpose: "구매 후 일상에서 어떻게 사용되는지 시각적으로 보여줘 구매 상상력 자극",
        contentDescription: "타겟 고객과 같은 모델이 실제 일상에서 제품을 사용하는 3가지 다른 맥락 장면",
        copyExample: `일상의 모든 순간에\n출근길 / 주말 나들이 / 집에서도`,
        visualNeeded: [
          {
            type: "image",
            description: "사무실/직장 환경에서 제품 사용 장면",
            aiImagePrompt: `Korean ${analysis.target.gender === "여성" ? "woman" : "man"} using product at modern office, professional setting, natural daylight, lifestyle photography, warm tones`,
            size: "800x800px",
            priority: "필수",
          },
          {
            type: "image",
            description: "주말 카페/야외에서 제품 사용 장면",
            aiImagePrompt: `Korean ${analysis.target.gender === "여성" ? "woman" : "man"} using product at cozy cafe, weekend lifestyle, warm natural light, candid photography style`,
            size: "800x800px",
            priority: "필수",
          },
          {
            type: "gif",
            description: "제품의 핵심 기능이 작동하는 모습을 보여주는 짧은 GIF",
            aiImagePrompt: "Product demonstration animation, clean white background, smooth motion, key feature highlight, 3-second loop",
            aiVideoPrompt: "Short 3-second GIF showing product key feature in action, clean minimal background, smooth animation",
            size: "800x600px",
            priority: "권장",
          },
        ],
        whyImproved: "기존에 라이프스타일 컷이 부족했음. 3가지 다른 맥락을 보여줘 다양한 구매자가 자신을 투영할 수 있게 함",
      },
      {
        order: 4,
        sectionName: "신뢰 수치 섹션",
        purpose: "객관적 숫자로 신뢰를 구축. '남들도 많이 샀다'는 사회적 증거 제공",
        contentDescription: "누적 판매량, 재구매율, 평점 등 신뢰 수치를 크게 강조",
        copyExample: `누적 판매 ○○개 돌파\n재구매율 ○○% · 평점 ○○점\n"한 번 쓰면 계속 찾게 되는 그 제품"`,
        visualNeeded: [
          {
            type: "image",
            description: "신뢰 수치를 크고 임팩트 있게 보여주는 인포그래픽",
            aiImagePrompt: "Trust metrics infographic with large numbers, Korean product statistics, clean dark navy background with gold accent numbers, professional design, high contrast",
            size: "1200x400px",
            priority: "필수",
          },
        ],
        whyImproved: "기존에 신뢰 요소가 부족했음. 구체적 수치는 막연한 자기 주장보다 3배 이상 설득력이 높음",
      },
      {
        order: 5,
        sectionName: "불안 해소 FAQ",
        purpose: "구매 전 망설이는 이유를 미리 파악해 선제적으로 해결",
        contentDescription: "리뷰/문의에서 반복되는 질문 TOP5를 FAQ 형식으로 배치",
        copyExample: `Q. 사이즈 선택이 어려워요\nA. 키 ○○cm / 체중 ○○kg 기준 ○호 추천드립니다\n\nQ. 소재가 피부에 괜찮을까요?\nA. ○○ 인증 완료, 민감한 피부도 안심하고 사용 가능합니다`,
        visualNeeded: [
          {
            type: "image",
            description: "FAQ 섹션을 깔끔하게 정리한 레이아웃 이미지",
            aiImagePrompt: "Clean FAQ section design, Korean e-commerce style, white background with soft gray dividers, question mark icons, minimalist layout",
            size: "1200x600px",
            priority: "권장",
          },
        ],
        whyImproved: "기존에 반복 문의가 많았음. FAQ를 상세페이지 본문에 선반영해 구매 결정 속도 향상",
      },
      {
        order: 6,
        sectionName: "리뷰 하이라이트",
        purpose: "실제 구매자 목소리로 신뢰와 공감을 동시에 전달",
        contentDescription: "리뷰에서 가장 공감을 얻은 문장을 크게 인용. 구매자 상황과 함께 제시",
        copyExample: `"처음엔 반신반의했는데, 한 달 쓰고 이제 못 없애겠어요" — 32세 직장인\n"선물했더니 며칠 뒤 가족들도 구매했어요" — 28세 주부`,
        visualNeeded: [
          {
            type: "image",
            description: "실제 리뷰 인용구를 감성적으로 디자인한 이미지",
            aiImagePrompt: "Testimonial quote card design, Korean e-commerce, warm beige background, elegant serif font quote marks, customer review highlight, soft shadow",
            size: "1200x500px",
            priority: "필수",
          },
        ],
        whyImproved: "리뷰가 단순 나열이었음. 핵심 문장을 추출해 큰 화면으로 강조하면 공감도와 신뢰도가 함께 상승",
      },
      {
        order: 7,
        sectionName: "구매 긴급성 + CTA",
        purpose: "지금 사야 할 이유를 만들어 결정을 미루는 행동을 방지",
        contentDescription: "한정 수량 / 오늘 배송 마감 / 이번 주 혜택 등 긴급성 요소 + 강한 CTA",
        copyExample: `오늘 ○시 이전 주문 시 내일 도착\n현재 재고 ○○개 남음\n[지금 바로 구매하기]`,
        visualNeeded: [
          {
            type: "image",
            description: "구매 긴급성을 시각적으로 강조하는 배너 (타이머 또는 재고 표시)",
            aiImagePrompt: "Urgency banner for Korean e-commerce, countdown timer design, limited stock indicator, bold red and white colors, strong CTA button, modern flat design",
            size: "1200x300px",
            priority: "필수",
          },
          {
            type: "video",
            description: "제품 사용 전/후 변화를 보여주는 15초 숏폼 영상",
            aiImagePrompt: "Before and after product transformation video concept, Korean lifestyle, 15 seconds, vertical format for mobile",
            aiVideoPrompt: "15-second before/after product demonstration video, Korean target audience, warm lifestyle setting, upbeat background music, subtitle text overlay showing key benefits",
            size: "1080x1920px (세로형)",
            priority: "권장",
          },
        ],
        whyImproved: "기존에 구매 긴급성이 전혀 없었음. 긴급성 요소는 전환율을 평균 15~25% 향상시키는 핵심 요소",
      },
    ],
    copywriting: {
      mainHeadline: `"매일 쓰고 싶어지는 그 느낌, ${productName}"`,
      subHeadline: "처음 받아보는 순간부터 달라지는 일상을 경험하세요",
      keyBenefits: [
        "하루 종일 편안한 착용감 — 피부 친화 소재 인증",
        "어떤 상황에도 어울리는 디자인",
        "한 번 쓰면 재구매율 ○○% — 품질로 증명",
      ],
      ctaText: "지금 바로 구매하기 →",
      faqItems: [
        { question: "사이즈 선택이 어려워요", answer: "상품 상세 사이즈 가이드를 확인하시거나, 문의 주시면 체형에 맞는 사이즈를 추천드립니다." },
        { question: "소재가 피부에 자극이 없나요?", answer: "피부 친화 소재로 제작되어 민감한 피부도 안심하고 사용하실 수 있습니다." },
        { question: "교환/환불이 쉽나요?", answer: "수령 후 7일 이내 단순 변심도 무료 교환/환불이 가능합니다." },
      ],
      trustStatement: "누적 판매 ○만 개 · 재구매율 ○○% · 고객 평점 ○○점",
    },
    visualGuide: {
      colorPalette: ["메인: 따뜻한 크림/베이지 (#F5F0E8)", "포인트: 딥 네이비 (#1A2A4A)", "강조: 골드 (#D4A853)"],
      fontStyle: "본문: 나눔스퀘어 또는 Pretendard (가독성 우선), 헤드라인: 굵은 고딕",
      imageTone: "따뜻한 자연광 (색온도 4000~5000K), 부드러운 그림자, 과도한 보정 없이 자연스럽게",
      overallMood: "신뢰감 있고 따뜻한 — '이 브랜드는 나를 이해한다'는 느낌",
    },
    differenceFromOriginal: [
      "제품 설명 중심 → 고객 공감 중심으로 전환 (첫 화면부터 타겟 상황 묘사)",
      "기능 나열 → 혜택 언어로 변환 ('면 100%' → '하루 종일 피부 자극 없음')",
      "반복 문의 사항을 FAQ로 선제 해소 (구매 결정 속도 향상)",
      "신뢰 수치를 크게 강조 (판매량/재구매율/평점 시각화)",
      "구매 긴급성 요소 추가 (배송 마감/한정 재고로 결정 미루기 방지)",
    ],
  };
}

export async function generateImprovementGuide(
  analysis: AnalysisResult,
  externalData: ExternalSearchData | null,
  apiKey?: string
): Promise<ImprovementGuide> {
  const key = apiKey || OPENAI_API_KEY;
  if (!key) {
    await new Promise((r) => setTimeout(r, 1000));
    return buildMockImprovementGuide(analysis);
  }
  const prompt = buildImprovementPrompt(analysis, externalData);
  return callOpenAIForImprovement(prompt, key);
}
