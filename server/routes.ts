import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { analyzePageContent, analyzeWithContent } from "./analyzer";
import { collectExternalData } from "./external-search";
import { generateImprovementGuide } from "./improvement-generator";
import { analyzeWithImages } from "./image-analyzer";
import { insertAnalysisSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";

// multer: 메모리에 이미지 저장 (최대 10장, 장당 15MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("이미지 파일만 업로드 가능합니다"));
  },
});

export function registerRoutes(httpServer: Server, app: Express) {
  // Start a new analysis
  app.post("/api/analyze", async (req, res) => {
    try {
      const { url, apiKey } = req.body;

      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URL이 필요합니다" });
      }

      // Validate URL
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: "올바른 URL 형식이 아닙니다" });
      }

      // Create analysis record
      const analysis = await storage.createAnalysis({
        url,
        status: "analyzing",
        result: null,
      });

      // Run full analysis pipeline async
      (async () => {
        try {
          // Step 1: Analyze page content (AI analysis or mock)
          const result = await analyzePageContent(url, apiKey);

          // Step 2: Collect external data (Naver + YouTube + Instagram) in parallel
          let externalData = null;
          try {
            const productName = result.basicInfo.productName;
            if (productName && productName !== "테스트 상품 (Mock 분석)") {
              externalData = await collectExternalData(productName);
            } else {
              // Mock external data when in mock mode
              externalData = {
                productName: result.basicInfo.productName,
                searchQuery: result.basicInfo.productName,
                collectedAt: new Date().toISOString(),
                naver: {
                  blogPosts: [
                    { title: "이 상품 진짜 써봤어요 - 솔직 후기", description: "3달째 사용 중인데 만족도가 높아서 후기 남겨요...", link: "#", postdate: "20260201" },
                    { title: "[공구] 이번 주 한정 공동구매 모집", description: "공구 신청 받습니다! 마감 임박이에요...", link: "#", postdate: "20260210" },
                    { title: "협찬받아 솔직하게 작성하는 리뷰입니다", description: "브랜드로부터 제품을 제공받아 작성한 글입니다...", link: "#", postdate: "20260215" },
                  ],
                  cafePosts: [
                    { title: "이 상품 공동구매 마감 임박", description: "몇 분 안 남았어요 빨리 신청하세요", link: "#", cafename: "쇼핑 공구 카페" },
                  ],
                  totalBlogCount: 1240,
                  totalCafeCount: 87,
                  recentBlogDates: ["20260215", "20260213", "20260210", "20260208", "20260205"],
                  isGroupBuyDetected: true,
                  groupBuyKeywords: ["공구", "공동구매", "마감임박"],
                  isPaidReviewDetected: true,
                  blogDateDistribution: { "2026-01": 156, "2026-02": 203, "2025-12": 98, "2025-11": 72 },
                },
                youtube: {
                  videos: [
                    { title: "이 상품 실사용 3개월 솔직 리뷰", channelTitle: "소비생활TV", publishedAt: "2026-02-10T00:00:00Z", viewCount: "182000", videoId: "mock1" },
                    { title: "구매 전 꼭 알아야 할 단점 5가지", channelTitle: "리뷰킹", publishedAt: "2026-01-22T00:00:00Z", viewCount: "94000", videoId: "mock2" },
                    { title: "비슷한 제품 3개 비교해봤어요", channelTitle: "비교해봄", publishedAt: "2026-01-15T00:00:00Z", viewCount: "43000", videoId: "mock3" },
                  ],
                  totalCount: 1840,
                  hasHighViewVideo: true,
                  recentUploadCount: 4,
                },
                instagram: {
                  estimatedHashtagPosts: "12,400개 이상",
                  topHashtags: ["#제품후기", "#솔직리뷰", "#추천템", "#언박싱", "#일상템"],
                  viralPossibility: "높음",
                  note: "네이버/유튜브 데이터 기반 Mock 추정값 (API 키 적용 시 실제 데이터 수집)",
                },
              };
            }
          } catch (extErr: any) {
            console.error("External data collection failed (non-fatal):", extErr.message);
          }

          // Step 3: Generate improvement guide
          let improvementGuide = null;
          try {
            improvementGuide = await generateImprovementGuide(result, externalData, apiKey);
          } catch (impErr: any) {
            console.error("Improvement guide generation failed (non-fatal):", impErr.message);
          }

          // Merge everything into result
          const fullResult = {
            ...result,
            externalData,
            improvementGuide,
          };

          await storage.updateAnalysis(analysis.id, {
            status: "done",
            result: fullResult as any,
          });
        } catch (err: any) {
          await storage.updateAnalysis(analysis.id, {
            status: "error",
            result: { error: err.message } as any,
          });
        }
      })();

      res.json({ id: analysis.id, status: "analyzing" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Poll analysis status
  app.get("/api/analyze/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "잘못된 ID" });

      const analysis = await storage.getAnalysis(id);
      if (!analysis) return res.status(404).json({ error: "분석을 찾을 수 없습니다" });

      res.json(analysis);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Test endpoint: analyze with pre-fetched content
  app.post("/api/analyze-content", async (req, res) => {
    try {
      const { url, content, apiKey } = req.body;
      if (!content) return res.status(400).json({ error: "content 필요" });

      const result = await analyzeWithContent(url || "test", content, apiKey);
      const productName = result.basicInfo.productName;
      let externalData = null;
      try { externalData = await collectExternalData(productName); } catch {}
      let improvementGuide = null;
      try { improvementGuide = await generateImprovementGuide(result, externalData, apiKey); } catch {}

      res.json({ ...result, externalData, improvementGuide });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 이미지(Full Page Screenshot) 업로드 + GPT-4o Vision 분석
  app.post("/api/analyze-images", upload.array("images", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "이미지를 하나 이상 업로드해주세요" });
      }

      const { url, apiKey } = req.body;
      const buffers = files.map((f) => f.buffer);
      const mimeTypes = files.map((f) => f.mimetype);

      // GPT-4o Vision으로 분석
      const result = await analyzeWithImages(url || "", buffers, mimeTypes, apiKey);

      // 외부 데이터 수집 (병렬)
      const productName = result.basicInfo?.productName || "";
      let externalData = null;
      let improvementGuide = null;

      if (productName && productName !== "테스트 상품 (Mock 분석)") {
        const [extResult, impResult] = await Promise.allSettled([
          collectExternalData(productName),
          (async () => {
            // 외부데이터 없이 먼저 개선가이드 생성
            return await generateImprovementGuide(result, null, apiKey);
          })(),
        ]);
        if (extResult.status === "fulfilled") externalData = extResult.value;
        if (impResult.status === "fulfilled") improvementGuide = impResult.value;

        // 외부데이터 있으면 개선가이드 재생성
        if (externalData && impResult.status === "rejected") {
          try {
            improvementGuide = await generateImprovementGuide(result, externalData, apiKey);
          } catch {}
        }
      }

      res.json({ ...result, externalData, improvementGuide });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 크롬 익스텐션 전용 API
  // content.js가 수집한 텍스트 데이터 + 이미지 URL로 GPT-4o 분석
  app.post("/api/analyze-extension", async (req, res) => {
    try {
      const { url, textData, imageUrls, apiKey } = req.body;

      if (!textData && !url) {
        return res.status(400).json({ error: "페이지 데이터가 없습니다" });
      }

      // 텍스트 데이터를 구조화된 content로 변환
      const content = buildContentFromExtension(textData, imageUrls || []);

      // GPT 분석
      const result = await analyzeWithContent(url || "", content, apiKey);
      const productName = result.basicInfo?.productName || "";

      let externalData = null;
      let improvementGuide = null;

      if (productName && productName !== "테스트 상품 (Mock 분석)") {
        const [extRes, impRes] = await Promise.allSettled([
          collectExternalData(productName),
          generateImprovementGuide(result, null, apiKey),
        ]);
        if (extRes.status === "fulfilled") externalData = extRes.value;
        if (impRes.status === "fulfilled") improvementGuide = impRes.value;
      }

      res.json({ ...result, externalData, improvementGuide });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}

// 익스텐션에서 받은 데이터를 GPT 프롬프트용 content 문자열로 바꾸기
function buildContentFromExtension(textData: any, imageUrls: string[]): string {
  if (!textData) return "";

  const parts: string[] = [];

  if (textData.productName) parts.push(`[\uc0c1\ud488\uba85] ${textData.productName}`);
  if (textData.price) parts.push(`[\uac00\uaca9] ${textData.price}`);
  if (textData.discount) parts.push(`[\ud560\uc778] ${textData.discount}`);
  if (textData.rating) parts.push(`[\ud3c9\uc810] ${textData.rating}`);
  if (textData.reviewCount) parts.push(`[\ub9ac\ube37\uc218] ${textData.reviewCount}`);
  if (textData.seller) parts.push(`[\ud310\ub9e4\uc790] ${textData.seller}`);

  if (textData.options && textData.options.length > 0) {
    parts.push(`[\uc635\uc158] ${textData.options.join(" / ")}`);
  }

  if (textData.description) {
    parts.push(`\n[\uc0c1\uc138 \uc124\uba85]\n${textData.description.slice(0, 5000)}`);
  }

  if (textData.reviews && textData.reviews.length > 0) {
    parts.push(`\n[\ub9ac\ube37 (${textData.reviews.length}\uac1c)]\n${textData.reviews.slice(0, 15).join("\n")}`);
  }

  if (textData.inquiries && textData.inquiries.length > 0) {
    parts.push(`\n[\uc0c1\ud488 \ubb38\uc758 (${textData.inquiries.length}\uac1c)]\n${textData.inquiries.slice(0, 10).join("\n")}`);
  }

  if (imageUrls.length > 0) {
    parts.push(`\n[\uc774\ubbf8\uc9c0 \uc218] \uc0c1\uc138\ud398\uc774\uc9c0\uc5d0 ${imageUrls.length}\uac1c \uc774\ubbf8\uc9c0 \ud655\uc778\ub428`);
  }

  return parts.join("\n");
}
