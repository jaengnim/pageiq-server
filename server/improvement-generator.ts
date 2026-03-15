import type { AnalysisResult } from "@shared/schema";
import type { ExternalSearchData } from "./external-search";

export interface ImprovementGuide {
  summary: string;
  targetPersona: {
    description: string;
    painPoints: string[];
    desiredOutcome: string;
    toneAndManner: string;
    persona: string;
    scenarios: string[];
  };
  pageStructure: PageSection[];
  copywriting: CopyGuide;
  visualGuide: VisualGuide;
  differenceFromOriginal: string[];
  improvementPriority: {
    immediate: { action: string; expectedEffect: string }[];
    shortTerm: { action: string; expectedEffect: string }[];
    midTerm: { action: string; expectedEffect: string }[];
  };
  coreVariables: {
    targetCustomer: string;
    coreProblem: string;
    strongestSellingPoint: string;
    hesitationReasons: string[];
    trustEvidence: string[];
    reviewHighlights: string[];
    mustShowScenes: string[];
    mustHaveFAQ: { q: string; a: string }[];
    toneAndManner: string;
    persuasionStructure: string;
  };
  estimatedCost: {
    analysisGPT: string;
    improvementGPT: string;
    pageGenerationGPT: string;
    totalPerSession: string;
    note: string;
  };
}

export interface PageSection {
  order: number;
  pacesStep: string;
  sectionName: string;
  purpose: string;
  contentDescription: string;
  copyExample: string;
  visualNeeded: VisualItem[];
  whyImproved: string;
  copyBefore?: string;
  copyAfter?: string;
}

export interface VisualItem {
  type: "image" | "gif" | "video";
  description: string;
  aiImagePrompt: string;
  aiVideoPrompt?: string;
  size: string;
  priority: "필수" | "권장" | "선택";
  shootingDirection?: string;
  replaceInstructions?: string;
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

  const level3Summary = (analysis as any).level3 ? `
Level3 분석 데이터:
- 추천 설득 구조: ${(analysis as any).level3?.coreVariables?.persuasionStructure || "없음"}
- 핵심 문제: ${(analysis as any).level3?.coreVariables?.coreProblem || "없음"}
- 가장 강한 판매 포인트: ${(analysis as any).level3?.coreVariables?.strongestSellingPoint || "없음"}
- 망설임 이유: ${JSON.stringify((analysis as any).level3?.coreVariables?.hesitationReasons || [])}
- 톤앤매너: ${(analysis as any).level3?.coreVariables?.toneAndManner || "없음"}
- 기존 페이지 구조 섹션 수: ${(analysis as any).level3?.newPageStructure?.length || 0}개
- 이미지 지시서 수: ${(analysis as any).level3?.imageDirectionList?.length || 0}개
` : "";

  const urgentFixesSummary = Array.isArray(analysis.urgentFixes)
    ? analysis.urgentFixes.map((f: any) => typeof f === "string" ? f : f.action).join(" / ")
    : "";

  return `당신은 대한민국 최고의 이커머스 상세페이지 기획자이자 전환율 최적화(CRO) 전문가입니다.
아래 분석 결과와 외부 데이터를 종합하여, 기존보다 전환율이 최소 2배 이상 높아질 수 있는 상세페이지 제작 가이드를 JSON 형식으로만 작성하세요. 다른 텍스트는 절대 포함하지 마세요.

## 분석 결과 요약
- 상품명: ${analysis.basicInfo.productName}
- 가격: ${analysis.basicInfo.price} (할인: ${analysis.basicInfo.discount})
- 카테고리: ${analysis.basicInfo.category}
- 판매자: ${analysis.basicInfo.seller}
- 리뷰 수: ${analysis.basicInfo.reviewCount} / 평점: ${analysis.basicInfo.rating}
- 전환력 점수: ${analysis.scores.overall}/100
- 주목도: ${analysis.scores.attention} / 이해도: ${analysis.scores.understanding} / 신뢰도: ${analysis.scores.trust}
- 매력도: ${analysis.scores.appeal} / 불안해소도: ${analysis.scores.anxietyRelief} / 구매유도력: ${analysis.scores.conversionPower}
- 핵심 문제: ${urgentFixesSummary}
- 타겟: ${analysis.target.gender} ${analysis.target.ageGroup} ${analysis.target.occupation}
- 구매 동기: ${analysis.target.buyingMotivation}
- 구매 장벽: ${analysis.target.buyingBarrier}
- 첫 화면 훅 문제: ${analysis.modules.firstHook.problem}
- 설득 구조 문제: ${analysis.modules.persuasionStructure.problem}
- 가치 제안 문제: ${analysis.modules.valueProposition.problem}
- 신뢰 요소 문제: ${analysis.modules.trustElements.problem}
- 불안 해소 문제: ${analysis.modules.anxietyHandling.problem}
- 리뷰 활용 문제: ${analysis.modules.reviewAnalysis.problem}
- 비주얼 문제: ${analysis.modules.visualComposition.problem}
- 전환 요소 문제: ${analysis.modules.conversionElements.problem}
${externalSummary}${level3Summary}

## 작성 규칙 (반드시 준수)
- pageStructure는 PACES 프레임워크(Problem→Agitation→Core solution→Evidence→Stimulus)로 최소 11개 섹션 구성: P(문제인식) 1개, A(문제확대/공감) 2개, C(핵심해결책/비교우위) 2개, E(증거/신뢰) 5개, S(전환자극) 1개
- 각 섹션의 copyExample은 실제 상품 정보를 반영한 구체적 카피 2~3문장 작성. '예시'나 '○○'같은 placeholder 금지, 실제 내용으로 작성
- 각 섹션에 visualNeeded 최소 1~2개 포함 (type/description/aiImagePrompt/shootingDirection/replaceInstructions 모두 작성)
- visualNeeded의 aiImagePrompt는 50단어 이상의 상세한 영문 프롬프트 작성
- shootingDirection은 촬영 앵글/조명/배경/구도를 구체적으로 설명
- replaceInstructions는 사용자가 실제 사진으로 교체할 때 참고할 지침
- copyBefore/copyAfter로 기존 vs 개선 카피 대비 포함
- improvementPriority: immediate(즉시 1주)/shortTerm(단기 2~4주)/midTerm(중기 1~2개월) 각 3개 이상
- coreVariables 10개 항목 모두 실제 상품 분석 기반으로 작성
- estimatedCost: 각 단계 비용 안내 포함
- 모든 내용은 한국어로, aiImagePrompt만 영문으로 작성

## JSON 응답 형식
{
  "summary": "기존보다 나은 이유 한 줄 요약 (구체적 수치/근거 포함)",
  "targetPersona": {
    "description": "타겟 고객 상세 묘사 (나이/직업/라이프스타일 2~3문장)",
    "painPoints": ["구체적 불편함1", "불편함2", "불편함3"],
    "desiredOutcome": "이 상품을 통해 얻고 싶은 결과",
    "toneAndManner": "페이지 전체 톤앤매너",
    "persona": "명시적 페르소나 묘사 2~3문장 (이름/나이/직업/생활패턴/고민 포함)",
    "scenarios": ["구매 시나리오1 (상황+감정+행동)", "시나리오2", "시나리오3"]
  },
  "pageStructure": [
    {
      "order": 1,
      "pacesStep": "P",
      "sectionName": "S1 감정 훅 — 문제 인식",
      "purpose": "이 섹션의 목적",
      "contentDescription": "담아야 할 내용 상세 설명",
      "copyExample": "실제 상품 정보 기반 카피 2~3문장 (placeholder 금지)",
      "copyBefore": "기존 카피 (있으면)",
      "copyAfter": "개선 카피",
      "visualNeeded": [
        {
          "type": "image",
          "description": "구체적 장면 설명",
          "aiImagePrompt": "50단어 이상 상세 영문 프롬프트",
          "size": "1200x800px",
          "priority": "필수",
          "shootingDirection": "앵글/조명/배경/구도 구체 설명",
          "replaceInstructions": "사용자가 실제 사진으로 교체할 때 참고 지침"
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
      {"question": "자주 묻는 질문3", "answer": "답변3"},
      {"question": "자주 묻는 질문4", "answer": "답변4"},
      {"question": "자주 묻는 질문5", "answer": "답변5"}
    ],
    "trustStatement": "신뢰 강화 문구 (구체적 수치 포함)"
  },
  "visualGuide": {
    "colorPalette": ["메인 컬러 + hex", "포인트 컬러 + hex", "보조 컬러 + hex"],
    "fontStyle": "추천 폰트 스타일 (본문/헤드라인 구분)",
    "imageTone": "이미지 전체 톤 (색온도/조명/분위기)",
    "overallMood": "전체 분위기 (타겟 심리와 연결해 설명)"
  },
  "differenceFromOriginal": [
    "기존 대비 개선 포인트1 (구체적 비교)",
    "개선 포인트2",
    "개선 포인트3",
    "개선 포인트4",
    "개선 포인트5"
  ],
  "improvementPriority": {
    "immediate": [
      {"action": "즉시 실행 가능한 액션1", "expectedEffect": "예상 효과"},
      {"action": "액션2", "expectedEffect": "효과"},
      {"action": "액션3", "expectedEffect": "효과"}
    ],
    "shortTerm": [
      {"action": "2~4주 내 실행 액션1", "expectedEffect": "예상 효과"},
      {"action": "액션2", "expectedEffect": "효과"},
      {"action": "액션3", "expectedEffect": "효과"}
    ],
    "midTerm": [
      {"action": "1~2개월 내 실행 액션1", "expectedEffect": "예상 효과"},
      {"action": "액션2", "expectedEffect": "효과"},
      {"action": "액션3", "expectedEffect": "효과"}
    ]
  },
  "coreVariables": {
    "targetCustomer": "타깃 고객 상세 (성별/나이/직업/라이프스타일)",
    "coreProblem": "핵심 문제 상황",
    "strongestSellingPoint": "가장 강한 판매 포인트 (경쟁사 대비)",
    "hesitationReasons": ["망설임1", "망설임2", "망설임3"],
    "trustEvidence": ["신뢰근거1", "신뢰근거2"],
    "reviewHighlights": ["강조리뷰1", "강조리뷰2", "강조리뷰3"],
    "mustShowScenes": ["필수 장면1", "장면2", "장면3"],
    "mustHaveFAQ": [{"q": "질문", "a": "답변"}],
    "toneAndManner": "톤앤매너 설명",
    "persuasionStructure": "추천 설득 구조 (PACES 등 + 이유)"
  },
  "estimatedCost": {
    "analysisGPT": "분석 단계 GPT-4o 예상 비용",
    "improvementGPT": "개선 가이드 생성 GPT-4o 예상 비용",
    "pageGenerationGPT": "페이지 생성 GPT-4o 예상 비용",
    "totalPerSession": "세션당 총 예상 비용",
    "note": "비용 관련 참고 사항"
  }
}

반드시 위 JSON 구조 전체를 빠짐없이 채워서 응답하세요. pageStructure는 PACES 기준 최소 11개 섹션을 작성하세요. JSON만 반환하세요.`;
}

async function callOpenAIForImprovement(prompt: string, apiKey: string): Promise<ImprovementGuide> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 8000,
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
  const gender = analysis.target.gender === "여성" ? "woman" : "man";
  const genderKr = analysis.target.gender;
  return {
    summary: `전환력 ${analysis.scores.overall}점 → 목표 80점 이상. 고객 공감 → 문제 확대 → 해결책 → 증거 5단계 → 전환 자극의 PACES 구조로 전면 재설계`,
    targetPersona: {
      description: `${analysis.target.ageGroup} ${genderKr} ${analysis.target.occupation}. 바쁜 일상 속 실용적이고 믿을 수 있는 선택을 원하며, 온라인 구매 시 리뷰와 상세페이지를 꼼꼼히 확인하는 신중한 소비자.`,
      painPoints: [
        analysis.target.buyingBarrier,
        "상세페이지를 봐도 내 상황에 맞는지 확신이 없음",
        "비슷한 상품이 많아 어떤 것이 진짜 좋은지 판단이 어려움",
      ],
      desiredOutcome: analysis.target.buyingMotivation,
      toneAndManner: "따뜻하고 공감적인 톤, 과장 없이 진정성 있게. 전문성은 갖추되 친근한 말투 유지",
      persona: `김지현(32세), ${analysis.target.occupation}. 평일에는 바쁘게 일하고 주말에는 자기관리에 투자하는 타입. 온라인 쇼핑 시 리뷰를 최소 10개 이상 읽고, 상세페이지가 불충분하면 바로 이탈하는 꼼꼼한 소비자.`,
      scenarios: [
        `퇴근 후 소파에서 스마트폰으로 쇼핑 중, "${productName}" 검색 후 상세페이지 진입. 첫 화면에서 '내 상황과 딱 맞다'는 느낌을 받고 스크롤 시작`,
        `주말 오전, 카페에서 비슷한 제품 3개를 비교하다가 이 페이지의 실사용 리뷰와 신뢰 수치를 보고 구매 결정`,
        `친구에게 추천받아 링크로 진입. 첫 화면의 공감 문구에 끌려 끝까지 읽고 바로 장바구니 담기`,
      ],
    },
    pageStructure: [
      {
        order: 1,
        pacesStep: "P",
        sectionName: "S1 감정 훅 — 문제 인식",
        purpose: "타겟 고객의 현실적 불편함을 첫 문장으로 정확히 짚어 '나를 위한 상품'임을 인식시킴",
        contentDescription: "고객이 겪는 구체적 상황을 묘사하는 짧고 강한 문구 + 해결책 암시. 3초 안에 스크롤을 멈추게 하는 감정 훅",
        copyExample: `"매일 같은 고민, 오늘은 다릅니다"\n${productName}이 그 답이 됩니다.`,
        copyBefore: "기존: 제품 단독 이미지 + 상품명만 표시",
        copyAfter: `개선: "매일 같은 고민, 오늘은 다릅니다" — 감정 훅으로 시작`,
        visualNeeded: [
          {
            type: "image",
            description: "타겟 고객과 동일한 연령대/성별 모델이 일상적 불편을 겪다가 표정이 밝아지는 비포/애프터 장면",
            aiImagePrompt: `Korean ${gender} in their ${analysis.target.ageGroup}, split composition showing before and after concept, left side showing tired frustrated expression in dim lighting, right side showing bright smile with warm golden hour natural lighting, cozy modern home interior background, soft beige and cream tones, lifestyle photography style, shallow depth of field, high quality realistic`,
            size: "1200x600px",
            priority: "필수",
            shootingDirection: "정면 또는 3/4 각도. 좌측은 차가운 조명(5500K), 우측은 따뜻한 조명(3500K). 배경은 깔끔한 실내. 모델 시선은 카메라를 향하게",
            replaceInstructions: "실제 고객 사진 또는 자사 모델 사진으로 교체. 비포/애프터 느낌이 나도록 좌우 분할 구도 유지. 밝기 차이가 핵심",
          },
        ],
        whyImproved: "기존은 제품 단독 컷으로 시작해 고객 공감이 없었음. 타겟 상황을 직접 묘사해 첫 3초 이탈률 30% 이상 감소 기대",
      },
      {
        order: 2,
        pacesStep: "A",
        sectionName: "S2 문제 확대 — 공감 심화",
        purpose: "고객이 겪는 불편함을 구체적으로 묘사해 '맞아, 바로 이거!' 반응 유도",
        contentDescription: "타겟 고객의 일상적 불편 3가지를 구체적 상황으로 묘사. 감정적 공감을 극대화",
        copyExample: `혹시 이런 경험 있으신가요?\n✗ 비슷한 제품 여러 개 사봤지만 만족한 적 없음\n✗ 리뷰 보고 샀는데 기대와 달라서 실망\n✗ 좋은 건 알겠는데, 내 상황에 맞는지 확신이 안 됨`,
        copyBefore: "기존: 문제 공감 없이 바로 스펙 나열",
        copyAfter: `개선: "혹시 이런 경험 있으신가요?" — 3가지 구체적 불편 상황 묘사`,
        visualNeeded: [
          {
            type: "image",
            description: "고민하는 표정의 타겟 고객 이미지 + 불편 포인트 텍스트 오버레이",
            aiImagePrompt: `Korean ${gender} in their ${analysis.target.ageGroup} looking thoughtful and slightly frustrated while browsing smartphone, sitting at desk or couch, natural indoor lighting, muted warm color palette, lifestyle photography, showing relatable everyday frustration moment, soft focus background, editorial style`,
            size: "1200x500px",
            priority: "필수",
            shootingDirection: "측면 3/4 앵글. 자연광 역광 또는 창가 조명. 모델이 스마트폰을 보며 고민하는 자연스러운 포즈. 따뜻하지만 약간 어두운 톤",
            replaceInstructions: "실제 고객 인터뷰 사진이나 모델 사진으로 교체. 고민/생각하는 표정이 핵심. 텍스트 오버레이 공간을 좌측 또는 하단에 확보",
          },
        ],
        whyImproved: "문제를 구체적으로 묘사하면 고객이 '이건 내 이야기'라고 느껴 다음 섹션(해결책)으로의 전환율이 높아짐",
      },
      {
        order: 3,
        pacesStep: "A",
        sectionName: "S3 문제 확대 — 감정 자극",
        purpose: "문제를 방치하면 어떤 결과가 오는지 부드럽게 자극해 해결 욕구 강화",
        contentDescription: "문제를 방치했을 때의 결과를 보여주되, 공포가 아닌 아쉬움/기회비용으로 접근",
        copyExample: `계속 미루면 달라지는 건 없습니다\n이미 ${analysis.basicInfo.reviewCount}명이 선택한 이유가 있습니다`,
        visualNeeded: [
          {
            type: "image",
            description: "시간이 지나도 같은 고민을 반복하는 이미지 vs 해결 후 밝은 이미지 대비",
            aiImagePrompt: `Split image comparison, left side showing calendar pages flying away symbolizing wasted time with muted gray tones, right side showing bright satisfied Korean ${gender} customer enjoying product benefits with warm golden lighting, clean minimalist composition, conceptual lifestyle photography, high quality`,
            size: "1200x500px",
            priority: "권장",
            shootingDirection: "좌우 분할. 좌측은 차갑고 무채색 톤, 우측은 따뜻하고 밝은 톤. 대비가 명확하게",
            replaceInstructions: "좌측은 그래픽으로 유지하고, 우측만 실제 제품 사용 사진으로 교체",
          },
        ],
        whyImproved: "단순 문제 제기에서 한 단계 더 나아가, '지금 행동해야 하는 이유'를 감정적으로 전달",
      },
      {
        order: 4,
        pacesStep: "C",
        sectionName: "S4 핵심 해결책 — 제품 소개",
        purpose: "문제의 정확한 해결책으로 제품을 포지셔닝. 스펙이 아닌 혜택 중심",
        contentDescription: "3가지 핵심 혜택을 각각 한 줄로 표현. 기능→혜택으로 변환해서 작성",
        copyExample: `${productName}이 다른 이유\n✓ 하루 종일 편안함 — 피부 자극 없는 소재\n✓ 어디서든 자신 있게 — 상황을 가리지 않는 디자인\n✓ 오래 써도 처음처럼 — 검증된 내구성`,
        copyBefore: "기존: 면 100% / 사이즈 S~XL / 색상 5종",
        copyAfter: `개선: "하루 종일 편안함 — 피부 자극 없는 소재" (혜택 언어)`,
        visualNeeded: [
          {
            type: "image",
            description: "3가지 혜택을 상징하는 아이콘 + 제품 이미지 조합 인포그래픽",
            aiImagePrompt: `Clean modern infographic layout showing 3 key product benefits with elegant icons, Korean lifestyle product centered in composition, white and cream background with teal accent color, minimalist flat design style, professional e-commerce layout, clear typography space, high resolution`,
            size: "1200x600px",
            priority: "필수",
            shootingDirection: "제품을 중앙에 놓고 좌우 또는 상하로 혜택 아이콘 배치. 깔끔한 화이트 배경",
            replaceInstructions: "제품 이미지를 실제 제품 사진으로 교체. 아이콘은 그대로 유지하되, 혜택 문구를 실제 제품 특성에 맞게 수정",
          },
          {
            type: "gif",
            description: "제품의 핵심 기능이 작동하는 모습을 보여주는 짧은 GIF",
            aiImagePrompt: `Product demonstration animation showing key feature in action, clean white studio background, smooth slow motion, close-up detail shot, warm natural lighting, professional product photography style, 3 second seamless loop, high quality rendering`,
            aiVideoPrompt: "Short 3-second GIF showing product key feature in action, clean minimal background, smooth animation, focus on the moment of benefit delivery",
            size: "800x600px",
            priority: "권장",
            shootingDirection: "클로즈업 탑다운 또는 45도 앵글. 제품 핵심 기능 부분을 확대. 3초 루프",
            replaceInstructions: "실제 제품으로 동일한 앵글에서 촬영. 스마트폰 슬로모션 기능으로 촬영 가능",
          },
        ],
        whyImproved: "기존은 스펙 나열이었음. 혜택 중심으로 전환해 '그래서 나에게 뭐가 좋은데?'에 즉시 답변",
      },
      {
        order: 5,
        pacesStep: "C",
        sectionName: "S5 비교 우위 — 차별점 강조",
        purpose: "경쟁 제품 대비 왜 이 제품이어야 하는지 시각적으로 비교",
        contentDescription: "타사 제품과의 비교표 또는 '일반 제품 vs 우리 제품' 형태로 차별점 강조",
        copyExample: `왜 ${productName}인가요?\n일반 제품: 기본 소재 / 제한적 디자인 / 단기 내구성\n${productName}: 프리미엄 소재 / 멀티 상황 디자인 / 장기 내구성 검증`,
        visualNeeded: [
          {
            type: "image",
            description: "비교표 형태의 인포그래픽 (일반 제품 vs 우리 제품)",
            aiImagePrompt: `Professional comparison chart infographic, left column labeled general product in muted gray, right column labeled our product in vibrant teal with gold highlights, checkmark and x-mark icons, clean modern layout, Korean e-commerce comparison style, white background, clear visual hierarchy, professional typography`,
            size: "1200x500px",
            priority: "필수",
            shootingDirection: "그래픽 기반. 좌측(일반)은 무채색, 우측(자사)은 포인트 컬러로 시각적 우위 표현",
            replaceInstructions: "비교 항목을 실제 제품 특성에 맞게 수정. 자사 제품 이미지를 실제 사진으로 교체",
          },
        ],
        whyImproved: "고객은 항상 비교 후 구매함. 우리가 먼저 비교를 보여주면 경쟁사 페이지로 이탈하는 것을 방지",
      },
      {
        order: 6,
        pacesStep: "E",
        sectionName: "S6 증거 — 실제 사용 장면",
        purpose: "구매 후 일상에서 어떻게 사용되는지 시각적으로 보여줘 구매 상상력 자극",
        contentDescription: "타겟 고객과 같은 모델이 실제 일상에서 제품을 사용하는 3가지 다른 맥락 장면",
        copyExample: `일상의 모든 순간에\n출근길에도 / 주말 나들이에도 / 집에서도`,
        visualNeeded: [
          {
            type: "image",
            description: "사무실/직장 환경에서 제품 사용 장면",
            aiImagePrompt: `Korean ${gender} in their ${analysis.target.ageGroup} using product at modern Korean office workspace, professional business casual setting, large window with natural daylight streaming in, warm neutral color palette, candid lifestyle photography style, showing product naturally integrated into work routine, shallow depth of field, editorial quality`,
            size: "800x800px",
            priority: "필수",
            shootingDirection: "3/4 앵글. 자연광 창가 좌석. 제품을 자연스럽게 사용하는 장면. 배경 아웃포커스",
            replaceInstructions: "동일한 앵글/조명으로 실제 직장인 모델 또는 고객 사진으로 교체. 제품이 자연스럽게 보이는 것이 핵심",
          },
          {
            type: "image",
            description: "주말 카페/야외에서 제품 사용 장면",
            aiImagePrompt: `Korean ${gender} in their ${analysis.target.ageGroup} enjoying weekend at trendy Korean cafe, using product naturally, warm ambient cafe lighting with exposed brick wall background, cozy relaxed atmosphere, lifestyle photography, candid unposed moment, warm earth tones, bokeh background, high quality realistic`,
            size: "800x800px",
            priority: "필수",
            shootingDirection: "측면 또는 3/4 앵글. 카페 창가석. 자연스러운 포즈. 따뜻한 실내 조명",
            replaceInstructions: "실제 카페에서 촬영. 자연스러운 일상 장면이 핵심. 모델이 제품을 의식하지 않는 듯한 캔디드 스타일",
          },
        ],
        whyImproved: "기존에 라이프스타일 컷이 부족했음. 다양한 맥락을 보여줘 구매자가 자신을 투영할 수 있게 함",
      },
      {
        order: 7,
        pacesStep: "E",
        sectionName: "S7 증거 — 신뢰 수치",
        purpose: "객관적 숫자로 신뢰를 구축. '남들도 많이 샀다'는 사회적 증거 제공",
        contentDescription: "누적 판매량, 재구매율, 평점 등 신뢰 수치를 크게 강조. 가능하면 실시간 데이터 연동",
        copyExample: `누적 판매 5만 개 돌파\n재구매율 68% · 평점 ${analysis.basicInfo.rating}점\n"한 번 쓰면 계속 찾게 되는 그 제품"`,
        visualNeeded: [
          {
            type: "image",
            description: "신뢰 수치를 크고 임팩트 있게 보여주는 인포그래픽",
            aiImagePrompt: `Trust metrics infographic with large bold numbers on dark navy blue background, Korean product statistics display, gold accent color for key numbers, showing sales count and repurchase rate and rating score, professional clean design with high contrast, minimal layout with strong visual hierarchy, premium feel`,
            size: "1200x400px",
            priority: "필수",
            shootingDirection: "그래픽 기반. 다크 네이비 배경에 골드 숫자. 숫자를 최대한 크게",
            replaceInstructions: "숫자를 실제 판매 데이터로 교체. 동일한 디자인 톤 유지",
          },
        ],
        whyImproved: "기존에 신뢰 요소가 부족했음. 구체적 수치는 막연한 자기 주장보다 3배 이상 설득력이 높음",
      },
      {
        order: 8,
        pacesStep: "E",
        sectionName: "S8 증거 — 리뷰 하이라이트",
        purpose: "실제 구매자 목소리로 신뢰와 공감을 동시에 전달",
        contentDescription: "리뷰에서 가장 공감을 얻은 문장을 크게 인용. 구매자 상황과 함께 제시",
        copyExample: `"처음엔 반신반의했는데, 한 달 쓰고 이제 못 없애겠어요" — 32세 직장인\n"선물했더니 며칠 뒤 가족들도 구매했어요" — 28세 주부\n"세 번째 재구매입니다. 주변에 다 추천해요" — 35세 프리랜서`,
        copyBefore: "기존: 리뷰 목록 단순 나열",
        copyAfter: "개선: 핵심 리뷰 3개를 큰 인용구로 강조 + 구매자 프로필 표시",
        visualNeeded: [
          {
            type: "image",
            description: "실제 리뷰 인용구를 감성적으로 디자인한 카드 이미지",
            aiImagePrompt: `Elegant testimonial quote cards layout for Korean e-commerce, three review cards arranged horizontally, warm beige linen texture background, large decorative serif quote marks in gold, clean modern typography, customer profile icons, soft drop shadow on cards, professional editorial design, warm and trustworthy mood`,
            size: "1200x500px",
            priority: "필수",
            shootingDirection: "그래픽 기반. 카드 형태 3개 횡배치. 따뜻한 베이지 배경. 골드 인용부호",
            replaceInstructions: "실제 리뷰 텍스트로 교체. 리뷰어 정보(나이/직업)를 가능한 범위에서 표기. 리뷰 캡처 이미지 추가 시 더 효과적",
          },
        ],
        whyImproved: "리뷰가 단순 나열이었음. 핵심 문장을 추출해 큰 화면으로 강조하면 공감도와 신뢰도가 함께 상승",
      },
      {
        order: 9,
        pacesStep: "E",
        sectionName: "S9 증거 — 불안 해소 FAQ",
        purpose: "구매 전 망설이는 이유를 미리 파악해 선제적으로 해결",
        contentDescription: "리뷰/문의에서 반복되는 질문 TOP5를 FAQ 형식으로 배치. 아코디언 UI 권장",
        copyExample: `구매 전 가장 많이 궁금해하신 질문\n\nQ. 사이즈 선택이 어려워요\nA. 키/체중별 추천 사이즈 가이드를 참고하세요. 추가 문의 시 1:1 상담 가능합니다\n\nQ. 소재가 피부에 괜찮을까요?\nA. KC 인증 완료. 민감한 피부도 안심하고 사용 가능합니다`,
        visualNeeded: [
          {
            type: "image",
            description: "FAQ 섹션을 깔끔한 아코디언 UI로 정리한 레이아웃",
            aiImagePrompt: `Clean modern FAQ accordion section design for Korean e-commerce product page, white background with soft gray dividers between questions, teal colored question mark icons, expandable answer sections, minimalist layout with plenty of white space, mobile-friendly responsive design mockup, professional UI design`,
            size: "1200x600px",
            priority: "권장",
            shootingDirection: "UI 목업 형태. 화이트 배경, 그레이 구분선. 질문은 볼드, 답변은 라이트",
            replaceInstructions: "실제 자주 묻는 질문으로 교체. 문의 게시판에서 TOP5 질문 추출 권장",
          },
        ],
        whyImproved: "기존에 반복 문의가 많았음. FAQ를 상세페이지 본문에 선반영해 구매 결정 속도 향상, 문의 건수 30% 이상 감소 기대",
      },
      {
        order: 10,
        pacesStep: "E",
        sectionName: "S10 증거 — 인증/보증",
        purpose: "제3자 인증, 보증 정책으로 최종 신뢰 확보",
        contentDescription: "품질 인증 마크, 교환/환불 정책, 보증 기간 등을 명확히 표시",
        copyExample: `안심하고 구매하세요\n✓ KC 안전 인증 완료\n✓ 7일 무조건 교환/환불\n✓ 100% 정품 보장`,
        visualNeeded: [
          {
            type: "image",
            description: "인증 마크와 보증 정책을 시각적으로 정리한 배지 이미지",
            aiImagePrompt: `Trust badges and certification marks layout for Korean e-commerce, showing KC safety mark and money back guarantee and authentic product seal, clean white background, official looking badge design with gold and navy colors, professional minimal layout, 3 badges in horizontal row, premium quality feel`,
            size: "1200x300px",
            priority: "필수",
            shootingDirection: "그래픽 기반. 배지 3개 횡배치. 공식적이고 신뢰감 있는 디자인",
            replaceInstructions: "실제 보유한 인증 마크로 교체. 없는 인증은 제거하고 실제 보증 정책으로 대체",
          },
        ],
        whyImproved: "기존에 인증/보증 정보가 하단에 작게 있었음. 구매 직전 마지막 망설임을 해소하는 결정적 요소",
      },
      {
        order: 11,
        pacesStep: "S",
        sectionName: "S11 전환 자극 — 긴급성 + CTA",
        purpose: "지금 사야 할 이유를 만들어 결정을 미루는 행동을 방지하고 즉시 전환 유도",
        contentDescription: "한정 수량/오늘 배송 마감/이번 주 혜택 등 긴급성 요소 + 강한 CTA 버튼",
        copyExample: `오늘 14시 이전 주문 시 내일 도착\n현재 재고 23개 남음\n첫 구매 고객 추가 할인 ${analysis.basicInfo.discount}\n\n[지금 바로 구매하기 →]`,
        copyBefore: "기존: 기본 구매 버튼만 표시",
        copyAfter: "개선: 배송 마감 + 잔여 재고 + 추가 혜택 + 강한 CTA",
        visualNeeded: [
          {
            type: "image",
            description: "구매 긴급성을 시각적으로 강조하는 배너 (타이머 + 재고 표시 + CTA)",
            aiImagePrompt: `Urgency and call to action banner for Korean e-commerce, countdown timer showing delivery deadline, limited stock number indicator, large bold CTA button in vibrant coral red color, white background with red accent elements, modern flat design, clear visual hierarchy with the CTA button as focal point, professional conversion-optimized layout`,
            size: "1200x400px",
            priority: "필수",
            shootingDirection: "그래픽 기반. 상단에 타이머/재고, 중앙에 혜택 요약, 하단에 큰 CTA 버튼. 붉은 계열 포인트 컬러",
            replaceInstructions: "실제 배송 마감 시간과 재고 수량으로 교체. CTA 문구는 A/B 테스트 권장",
          },
          {
            type: "video",
            description: "제품 사용 전/후 변화를 보여주는 15초 숏폼 영상",
            aiImagePrompt: `Before and after product transformation concept storyboard, Korean lifestyle setting, 15 second vertical format for mobile viewing, showing daily life improvement after using product, warm color grading, upbeat positive mood, text overlay space for key benefits, professional video production quality`,
            aiVideoPrompt: "15-second before/after product demonstration video, Korean target audience, warm lifestyle setting, upbeat background music, subtitle text overlay showing key benefits, vertical 9:16 format",
            size: "1080x1920px (세로형)",
            priority: "권장",
            shootingDirection: "세로형 촬영. 전반 5초 비포(문제 상황), 후반 10초 애프터(해결된 상태). 자막 오버레이 필수",
            replaceInstructions: "실제 제품으로 비포/애프터 촬영. 스마트폰 세로 모드로 촬영 가능. 자막은 후편집으로 추가",
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
        "어떤 상황에도 어울리는 디자인 — 출근부터 주말까지",
        "한 번 쓰면 재구매율 68% — 품질로 증명된 내구성",
      ],
      ctaText: "지금 바로 구매하기 →",
      faqItems: [
        { question: "사이즈 선택이 어려워요", answer: "상품 상세 사이즈 가이드를 확인하시거나, 문의 주시면 체형에 맞는 사이즈를 추천드립니다." },
        { question: "소재가 피부에 자극이 없나요?", answer: "KC 인증 완료 소재로 민감한 피부도 안심하고 사용하실 수 있습니다." },
        { question: "교환/환불이 쉽나요?", answer: "수령 후 7일 이내 단순 변심도 무료 교환/환불이 가능합니다." },
        { question: "배송은 얼마나 걸리나요?", answer: "평일 14시 이전 주문 시 익일 배송됩니다. 주말/공휴일은 다음 영업일 출고됩니다." },
        { question: "세탁 방법은?", answer: "세탁망에 넣어 찬물 세탁 권장드립니다. 건조기 사용 가능합니다." },
      ],
      trustStatement: `누적 판매 5만 개 · 재구매율 68% · 고객 평점 ${analysis.basicInfo.rating}점 · 리뷰 ${analysis.basicInfo.reviewCount}개`,
    },
    visualGuide: {
      colorPalette: ["메인: 따뜻한 크림/베이지 (#F5F0E8)", "포인트: 딥 네이비 (#1A2A4A)", "강조: 골드 (#D4A853)"],
      fontStyle: "본문: Pretendard 400 (가독성 우선) / 헤드라인: Pretendard 700 (굵은 고딕) / 카피: 나눔명조 (감성 포인트)",
      imageTone: "따뜻한 자연광 (색온도 4000~5000K), 부드러운 그림자, 과도한 보정 없이 자연스럽게. 전체적으로 밝고 깨끗한 느낌",
      overallMood: "신뢰감 있고 따뜻한 — '이 브랜드는 나를 이해한다'는 느낌. 과장 없는 진정성이 핵심",
    },
    differenceFromOriginal: [
      "제품 설명 중심 → PACES 프레임워크 기반 고객 공감 중심으로 전환 (첫 화면부터 타겟 상황 묘사)",
      "기능 나열 → 혜택 언어로 변환 ('면 100%' → '하루 종일 피부 자극 없는 소재')",
      "반복 문의 사항을 FAQ로 선제 해소 (구매 결정 속도 향상, 문의 30% 감소 기대)",
      "신뢰 수치를 크게 강조 (판매량/재구매율/평점을 시각적으로 임팩트 있게 배치)",
      "구매 긴급성 요소 추가 (배송 마감/한정 재고로 결정 미루기 방지, 전환율 15~25% 향상 기대)",
    ],
    improvementPriority: {
      immediate: [
        { action: "첫 화면 훅 문구를 고객 공감형으로 교체", expectedEffect: "첫 3초 이탈률 30% 감소" },
        { action: "핵심 혜택 3가지를 기능→혜택 언어로 변환", expectedEffect: "스크롤 깊이 20% 증가" },
        { action: "CTA 버튼에 긴급성 요소(배송 마감/재고) 추가", expectedEffect: "전환율 15% 향상" },
      ],
      shortTerm: [
        { action: "리뷰 하이라이트 섹션 추가 (핵심 리뷰 3개 인용)", expectedEffect: "신뢰도 점수 20점 향상" },
        { action: "FAQ 섹션을 상세페이지 본문에 배치", expectedEffect: "문의 건수 30% 감소" },
        { action: "비교 우위 표 추가 (일반 제품 vs 자사 제품)", expectedEffect: "경쟁사 이탈률 25% 감소" },
      ],
      midTerm: [
        { action: "라이프스타일 촬영 진행 (3가지 맥락 장면)", expectedEffect: "구매 상상력 자극, 전환율 10% 추가 향상" },
        { action: "15초 숏폼 영상 제작 (비포/애프터)", expectedEffect: "SNS 바이럴 가능성 확보, 유입 채널 다변화" },
        { action: "A/B 테스트 운영 (기존 vs 개선 페이지)", expectedEffect: "데이터 기반 지속 최적화 체계 구축" },
      ],
    },
    coreVariables: {
      targetCustomer: `${analysis.target.ageGroup} ${genderKr} ${analysis.target.occupation}. 온라인 쇼핑 시 리뷰와 상세페이지를 꼼꼼히 확인하는 신중한 소비자`,
      coreProblem: "비슷한 상품이 많아 어떤 것이 진짜 좋은지 판단이 어렵고, 상세페이지만으로는 확신이 들지 않는 상태",
      strongestSellingPoint: `${analysis.basicInfo.reviewCount}개 리뷰와 ${analysis.basicInfo.rating}점 평점으로 검증된 품질. 재구매율이 높아 한 번 쓰면 계속 찾는 제품`,
      hesitationReasons: [
        analysis.target.buyingBarrier,
        "실물이 사진과 다를 수 있다는 우려",
        "비슷한 가격대 다른 제품과의 차이점이 불분명",
      ],
      trustEvidence: [
        `누적 리뷰 ${analysis.basicInfo.reviewCount}개, 평점 ${analysis.basicInfo.rating}점`,
        "KC 안전 인증 완료, 7일 무조건 교환/환불 보증",
      ],
      reviewHighlights: [
        "가볍고 편해서 매일 쓰게 된다",
        "선물했더니 가족들도 구매했다",
        "세 번째 재구매, 주변에 추천 중",
      ],
      mustShowScenes: [
        "직장/사무실에서 사용하는 장면",
        "주말 카페/야외 나들이 장면",
        "집에서 편하게 사용하는 장면",
      ],
      mustHaveFAQ: [
        { q: "사이즈 선택이 어려워요", a: "키/체중별 추천 사이즈 가이드 제공" },
        { q: "소재가 피부에 자극이 없나요?", a: "KC 인증 완료, 민감 피부 안심 사용" },
        { q: "교환/환불이 쉽나요?", a: "7일 이내 무료 교환/환불" },
      ],
      toneAndManner: "따뜻하고 공감적인 톤, 과장 없이 진정성 있게. 전문성은 갖추되 친근한 말투 유지. 고객을 이해하는 브랜드라는 느낌",
      persuasionStructure: "PACES 구조 (Problem→Agitation→Core solution→Evidence→Stimulus). 감정에서 시작해 논리로 뒷받침하고 행동으로 마무리하는 흐름",
    },
    estimatedCost: {
      analysisGPT: "GPT-4o 1회 호출 (약 8K 토큰 출력) ≈ $0.12~0.16",
      improvementGPT: "GPT-4o 1회 호출 (약 8K 토큰 출력) ≈ $0.12~0.16",
      pageGenerationGPT: "GPT-4o 1~2회 호출 (HTML 생성) ≈ $0.20~0.32",
      totalPerSession: "총 3~4회 호출 ≈ $0.44~0.64 (약 600~900원)",
      note: "이미지 생성(DALL-E 3) 사용 시 이미지당 $0.04~0.08 추가. 11개 섹션 전체 이미지 생성 시 약 $0.50~1.00 추가",
    },
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
