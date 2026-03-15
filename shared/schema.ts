import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  status: text("status").notNull().default("pending"), // pending, analyzing, done, error
  result: jsonb("result"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({ id: true, createdAt: true });
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;

// Analysis result structure
export interface AnalysisResult {
  basicInfo: BasicInfo;
  scores: Scores;
  modules: Modules;
  target: TargetProfile;
  topStrengths: any[];
  topWeaknesses: any[];
  urgentFixes: any[];
  oneLinerDiagnosis: string;
  inflowScenarios: InflowScenario[];
  // Phase 2 additions
  externalData?: ExternalSearchData;
  improvementGuide?: ImprovementGuide;
  // Phase 3: level3 deep analysis
  level3?: {
    priorityTable?: { timeframe: string; action: string; expectedEffect: string }[];
    newPageStructure?: { step: string; sectionName: string; headline: string; subCopy: string; visual: string; whyNeeded: string }[];
    imageDirectionList?: { no: number; type: string; content: string; direction: string; purpose: string; aiPrompt: string }[];
    coreVariables?: any;
  };
}

export interface BasicInfo {
  productName: string;
  price: string;
  discount: string;
  options: string[];
  category: string;
  seller: string;
  reviewCount: string;
  rating: string;
}

export interface Scores {
  overall: number;
  attention: number;       // 주목도
  understanding: number;   // 이해도
  trust: number;           // 신뢰도
  appeal: number;          // 매력도
  anxietyRelief: number;   // 불안해소도
  conversionPower: number; // 구매유도력
}

export interface ModuleResult {
  score: number;
  currentState: string;
  problem: string;
  improvement: string;
  example: string;
  subScores?: { name: string; score: number }[];
}

export interface Modules {
  basicInfo: ModuleResult;
  firstHook: ModuleResult;
  targetFit: ModuleResult;
  persuasionStructure: ModuleResult;
  valueProposition: ModuleResult;
  trustElements: ModuleResult;
  anxietyHandling: ModuleResult;
  reviewAnalysis: ModuleResult;
  inquiryAnalysis: ModuleResult;
  visualComposition: ModuleResult;
  conversionElements: ModuleResult;
  inflowPotential: ModuleResult;
}

export interface TargetProfile {
  gender: string;
  ageGroup: string;
  occupation: string;
  region: string;
  income: string;
  buyingMotivation: string;
  buyingBarrier: string;
  confidence: number;
  persona?: string;
  scenarios?: string[];
}

export interface InflowScenario {
  type: string;
  probability: string;
  reason: string;
  channel: string;
}

// ── Phase 2: External Search Data ────────────────────────────────────────────
export interface NaverSearchResult {
  blogPosts: { title: string; description: string; link: string; postdate: string }[];
  cafePosts: { title: string; description: string; link: string; cafename: string }[];
  totalBlogCount: number;
  totalCafeCount: number;
  recentBlogDates: string[];
  isGroupBuyDetected: boolean;
  groupBuyKeywords: string[];
  isPaidReviewDetected: boolean;
  blogDateDistribution: Record<string, number>;
}

export interface YouTubeSearchResult {
  videos: { title: string; channelTitle: string; publishedAt: string; viewCount: string; videoId: string }[];
  totalCount: number;
  hasHighViewVideo: boolean;
  recentUploadCount: number;
}

export interface InstagramSearchResult {
  estimatedHashtagPosts: string;
  topHashtags: string[];
  viralPossibility: string;
  note: string;
}

export interface ExternalSearchData {
  naver: NaverSearchResult | null;
  youtube: YouTubeSearchResult | null;
  instagram: InstagramSearchResult | null;
  productName: string;
  searchQuery: string;
  collectedAt: string;
}

// ── Phase 2: Improvement Guide ────────────────────────────────────────────────
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

export interface PageSection {
  order: number;
  pacesStep?: string;
  sectionName: string;
  purpose: string;
  contentDescription: string;
  copyExample: string;
  copyBefore?: string;
  copyAfter?: string;
  visualNeeded: VisualItem[];
  whyImproved: string;
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

export interface ImprovementGuide {
  summary: string;
  targetPersona: {
    description: string;
    painPoints: string[];
    desiredOutcome: string;
    toneAndManner: string;
    persona?: string;
    scenarios?: string[];
  };
  pageStructure: PageSection[];
  copywriting: CopyGuide;
  visualGuide: VisualGuide;
  differenceFromOriginal: string[];
  improvementPriority?: {
    immediate: { action: string; expectedEffect: string }[];
    shortTerm: { action: string; expectedEffect: string }[];
    midTerm: { action: string; expectedEffect: string }[];
  };
  coreVariables?: {
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
  estimatedCost?: {
    analysisGPT: string;
    improvementGPT: string;
    pageGenerationGPT: string;
    totalPerSession: string;
    note: string;
  };
}
