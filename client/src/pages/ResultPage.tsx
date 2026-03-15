import { useParams } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { getPasteResult } from "@/lib/pasteStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  Analysis, AnalysisResult, ModuleResult, Scores,
  ExternalSearchData, ImprovementGuide, PageSection, VisualItem
} from "@shared/schema";

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 70) return "score-excellent";
  if (score >= 45) return "score-good";
  return "score-poor";
}
function scoreBg(score: number) {
  if (score >= 70) return "bg-score-excellent";
  if (score >= 45) return "bg-score-good";
  return "bg-score-poor";
}
function scoreLabel(score: number) {
  if (score >= 80) return "우수";
  if (score >= 60) return "양호";
  if (score >= 40) return "보통";
  return "취약";
}
function formatDate(dateStr: string) {
  if (!dateStr || dateStr.length < 8) return dateStr;
  return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
}
function formatNumber(n: number) {
  if (n >= 10000) return `${Math.floor(n / 10000)}만+`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toString();
}
function formatViewCount(s: string) {
  const n = parseInt(s) || 0;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${Math.floor(n / 10000)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return s;
}
function getYouTubeThumbnail(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

// Helper: extract display text from topStrengths/topWeaknesses/urgentFixes items (string or object)
function itemTitle(item: any): string {
  if (typeof item === "string") return item;
  return item?.title || item?.action || String(item);
}
function itemDetail(item: any): string | null {
  if (typeof item === "string") return null;
  return item?.detail || item?.expectedEffect || null;
}
function itemTimeframe(item: any): string | null {
  if (typeof item !== "object" || !item) return null;
  return item?.timeframe || null;
}

// PACES step color
function pacesColor(step?: string): string {
  if (!step) return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  const s = step.toUpperCase();
  if (s.startsWith("P")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (s.startsWith("A")) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (s.startsWith("C")) return "bg-purple-500/20 text-purple-400 border-purple-500/30";
  if (s.startsWith("E")) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  if (s.startsWith("S")) return "bg-red-500/20 text-red-400 border-red-500/30";
  return "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

// Timeframe badge color
function timeframeBadge(tf: string): string {
  const lower = tf.toLowerCase();
  if (lower.includes("즉시") || lower.includes("immediate")) return "bg-red-500/20 text-red-400 border-red-500/30";
  if (lower.includes("단기") || lower.includes("short")) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  if (lower.includes("중기") || lower.includes("mid")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  return "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

// Sub-score badge color
function subScoreBadgeColor(score: number): string {
  if (score >= 70) return "bg-green-500/15 text-green-400 border-green-500/30";
  if (score >= 45) return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
}

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const col = score >= 70 ? "hsl(142 76% 45%)" : score >= 45 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)";

  return (
    <svg width={size} height={size} viewBox="0 0 90 90" className="score-ring">
      <circle cx="45" cy="45" r={r} fill="none" stroke="hsl(222 18% 16%)" strokeWidth="8"/>
      <circle
        cx="45" cy="45" r={r} fill="none"
        stroke={col} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 45 45)"
        className="transition-all duration-1000"
      />
      <text x="45" y="49" textAnchor="middle" dominantBaseline="middle"
        fill={col} fontSize="16" fontWeight="700" fontFamily="Cabinet Grotesk, sans-serif">
        {score}
      </text>
    </svg>
  );
}

// ── Radar Chart ───────────────────────────────────────────────────────────────
function RadarChart({ scores }: { scores: Scores }) {
  const labels = ["주목도", "이해도", "신뢰도", "매력도", "불안해소", "구매유도"];
  const values = [scores.attention, scores.understanding, scores.trust, scores.appeal, scores.anxietyRelief, scores.conversionPower];
  const n = labels.length;
  const cx = 100, cy = 100, r = 75;

  const angleStep = (2 * Math.PI) / n;
  const getPoint = (i: number, val: number) => {
    const angle = i * angleStep - Math.PI / 2;
    const dist = (val / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };
  const getLabelPoint = (i: number) => {
    const angle = i * angleStep - Math.PI / 2;
    return { x: cx + (r + 20) * Math.cos(angle), y: cy + (r + 20) * Math.sin(angle) };
  };

  const polygon = values.map((v, i) => `${getPoint(i, v).x},${getPoint(i, v).y}`).join(" ");
  const gridPolygon = (level: number) =>
    Array.from({ length: n }, (_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return `${cx + level * Math.cos(angle)},${cy + level * Math.sin(angle)}`;
    }).join(" ");

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[240px] mx-auto">
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <polygon key={t} points={gridPolygon(r * t)} fill="none" stroke="hsl(222 18% 18%)" strokeWidth="1"/>
      ))}
      {Array.from({ length: n }, (_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        return (
          <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)}
            stroke="hsl(222 18% 18%)" strokeWidth="1"/>
        );
      })}
      <polygon points={polygon} fill="hsl(210 100% 56% / 0.2)" stroke="hsl(210 100% 56%)" strokeWidth="2"/>
      {values.map((v, i) => {
        const pt = getPoint(i, v);
        return <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="hsl(210 100% 56%)"/>;
      })}
      {labels.map((label, i) => {
        const pt = getLabelPoint(i);
        return (
          <text key={i} x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="middle"
            fill="hsl(210 10% 55%)" fontSize="9" fontFamily="Noto Sans KR, sans-serif">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ── Module Names ──────────────────────────────────────────────────────────────
const MODULE_NAMES: Record<string, string> = {
  basicInfo: "기본 정보",
  firstHook: "첫 화면 훅",
  targetFit: "타겟 적합성",
  persuasionStructure: "설득 구조",
  valueProposition: "핵심 가치",
  trustElements: "신뢰 요소",
  anxietyHandling: "불안 해소",
  reviewAnalysis: "리뷰 분석",
  inquiryAnalysis: "문의 분석",
  visualComposition: "비주얼 구성",
  conversionElements: "구매전환 요소",
  inflowPotential: "유입 가능성",
};

// ── Tab1: Level1 Quick Diagnosis ──────────────────────────────────────────────
function Tab1Level1({ scores, oneLinerDiagnosis, topStrengths, topWeaknesses, urgentFixes }: {
  scores: Scores;
  oneLinerDiagnosis: string;
  topStrengths: any[];
  topWeaknesses: any[];
  urgentFixes: any[];
}) {
  const sixAxes = [
    { key: "attention", label: "주목도", score: scores.attention },
    { key: "understanding", label: "이해도", score: scores.understanding },
    { key: "trust", label: "신뢰도", score: scores.trust },
    { key: "appeal", label: "매력도", score: scores.appeal },
    { key: "anxietyRelief", label: "불안해소도", score: scores.anxietyRelief },
    { key: "conversionPower", label: "구매유도력", score: scores.conversionPower },
  ];

  return (
    <div className="space-y-6">
      {/* Overall score + 6 axis bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">전체 전환력 점수</p>
          <ScoreRing score={scores.overall} size={140}/>
          <Badge className={`${scoreBg(scores.overall)} text-sm px-3 py-1`}>
            <span className={scoreColor(scores.overall)}>{scoreLabel(scores.overall)}</span>
          </Badge>
          <RadarChart scores={scores}/>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">6축 상세 점수</p>
          <div className="space-y-3">
            {sixAxes.map(({ key, label, score }) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className={`text-sm font-bold font-display ${scoreColor(score)}`}>{score}</span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${score}%`, background: score >= 70 ? "hsl(142 76% 45%)" : score >= 45 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)" }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* One-liner quote box */}
      <div className="bg-card border border-primary/20 rounded-2xl p-6 relative">
        <div className="absolute top-3 left-4 text-4xl text-primary/20 font-serif leading-none">&ldquo;</div>
        <div className="pl-8 pr-4">
          <p className="text-xs text-muted-foreground mb-2">한 줄 판매력 진단</p>
          <p className="text-base font-semibold text-foreground italic leading-relaxed">{oneLinerDiagnosis}</p>
        </div>
        <div className="absolute bottom-3 right-4 text-4xl text-primary/20 font-serif leading-none">&rdquo;</div>
      </div>

      {/* Strengths TOP 5 */}
      <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>핵심 강점 TOP 5
        </h3>
        <div className="space-y-2">
          {(topStrengths || []).map((s: any, i: number) => (
            <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-green-500/5 border border-green-500/10">
              <span className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-green-400">{i+1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/90 font-medium">{itemTitle(s)}</p>
                {itemDetail(s) && <p className="text-xs text-muted-foreground mt-0.5">{itemDetail(s)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weaknesses TOP 5 */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>이탈/망설임 요인 TOP 5
        </h3>
        <div className="space-y-2">
          {(topWeaknesses || []).map((w: any, i: number) => (
            <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <span className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-red-400">{i+1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/90 font-medium">{itemTitle(w)}</p>
                {itemDetail(w) && <p className="text-xs text-muted-foreground mt-0.5">{itemDetail(w)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Urgent Fixes */}
      <div className="bg-card border border-red-500/30 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse"/>즉시 수정 필요 항목
        </h3>
        <div className="space-y-2">
          {(urgentFixes || []).map((f: any, i: number) => {
            const tf = itemTimeframe(f);
            return (
              <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-red-400">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm text-foreground/90 font-medium">{itemTitle(f)}</p>
                    {tf && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${timeframeBadge(tf)}`}>{tf}</span>
                    )}
                  </div>
                  {itemDetail(f) && <p className="text-xs text-muted-foreground mt-0.5">{itemDetail(f)}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Tab2: Level2 Module Analysis ──────────────────────────────────────────────
function ModuleCard2({ name, data }: { name: string; data: ModuleResult }) {
  const mod = data as any;
  const subScores: { name: string; score: number }[] = mod.subScores || [];

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border/30">
        <span className="text-sm font-semibold text-foreground">{MODULE_NAMES[name] || name}</span>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold font-display ${scoreColor(data.score)}`}>{data.score}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${scoreBg(data.score)} ${scoreColor(data.score)}`}>{scoreLabel(data.score)}</span>
        </div>
      </div>

      {/* Score bar */}
      <div className="px-4 pt-3">
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${data.score}%`, background: data.score >= 70 ? "hsl(142 76% 45%)" : data.score >= 45 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)" }}/>
        </div>
      </div>

      {/* SubScores */}
      {subScores.length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-1.5">
          {subScores.map((ss, i) => (
            <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${subScoreBadgeColor(ss.score)}`}>
              {ss.name} {ss.score}
            </span>
          ))}
        </div>
      )}

      {/* 4 colored sections */}
      <div className="p-4 space-y-2">
        <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3 space-y-1">
          <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">현재 상태</p>
          <p className="text-xs text-foreground/80 leading-relaxed">{data.currentState}</p>
        </div>
        <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 space-y-1">
          <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">문제가 되는 이유</p>
          <p className="text-xs text-foreground/80 leading-relaxed">{data.problem}</p>
        </div>
        <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/10 p-3 space-y-1">
          <p className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wider">개선 방향</p>
          <p className="text-xs text-foreground/80 leading-relaxed">{data.improvement}</p>
        </div>
        {data.example && (
          <div className="rounded-lg bg-green-500/5 border border-green-500/10 p-3 space-y-1">
            <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">실제 수정 예시</p>
            <p className="text-xs text-foreground/90 leading-relaxed font-mono whitespace-pre-line">{data.example}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Tab2Modules({ modules }: { modules: any }) {
  // Sort modules by score ascending (worst first)
  const sorted = Object.entries(modules || {}).sort(
    (a, b) => ((a[1] as ModuleResult).score || 0) - ((b[1] as ModuleResult).score || 0)
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">점수가 낮은 모듈부터 표시됩니다 (개선 필요도 순)</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map(([key, data]) => (
          <ModuleCard2 key={key} name={key} data={data as ModuleResult}/>
        ))}
      </div>
    </div>
  );
}

// ── Tab3: Level3 Generative Diagnosis ─────────────────────────────────────────
function Tab3Level3({ result }: { result: any }) {
  const level3 = result?.level3 || {};
  const urgentFixes = result?.urgentFixes || [];
  const improvementGuide = result?.improvementGuide;
  const coreVars = level3?.coreVariables || improvementGuide?.coreVariables;

  // Priority table: use level3.priorityTable or convert urgentFixes
  const priorityTable: { timeframe: string; action: string; expectedEffect: string }[] =
    level3?.priorityTable || urgentFixes.map((f: any) => ({
      timeframe: typeof f === "object" ? (f.timeframe || "즉시") : "즉시",
      action: typeof f === "string" ? f : (f.action || String(f)),
      expectedEffect: typeof f === "object" ? (f.expectedEffect || "") : "",
    }));

  const newPageStructure = level3?.newPageStructure || [];
  const imageDirectionList = level3?.imageDirectionList || [];
  const [expandedPrompts, setExpandedPrompts] = useState<Record<number, boolean>>({});

  const coreVariableLabels = [
    { key: "targetCustomer", label: "타깃 고객" },
    { key: "coreProblem", label: "핵심 문제 상황" },
    { key: "strongestSellingPoint", label: "가장 강한 판매 포인트" },
    { key: "hesitationReasons", label: "고객 망설임 이유" },
    { key: "trustEvidence", label: "신뢰를 줄 근거" },
    { key: "reviewHighlights", label: "강조할 리뷰 포인트" },
    { key: "mustShowScenes", label: "꼭 보여줄 사용 장면" },
    { key: "mustHaveFAQ", label: "꼭 필요한 FAQ" },
    { key: "toneAndManner", label: "적합한 톤앤매너" },
    { key: "persuasionStructure", label: "추천 설득 구조" },
  ];

  return (
    <div className="space-y-6">
      {/* Priority table */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-xs text-primary">1</span>
          개선 우선순위 테이블
        </h3>
        {priorityTable.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium w-24">시기</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">조치 사항</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium w-40">예상 효과</th>
                </tr>
              </thead>
              <tbody>
                {priorityTable.map((row, i) => (
                  <tr key={i} className="border-b border-border/20 last:border-0">
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${timeframeBadge(row.timeframe)}`}>
                        {row.timeframe}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-foreground/80">{row.action}</td>
                    <td className="py-2 px-3 text-muted-foreground">{row.expectedEffect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">우선순위 데이터가 없습니다</p>
        )}
      </div>

      {/* New page structure (PACES) */}
      {newPageStructure.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-xs text-primary">2</span>
            새 상세페이지 기획서 (PACES 구조)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium w-20">단계</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium w-28">섹션명</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">핵심 카피</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium w-28">비주얼</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium w-32">이유</th>
                </tr>
              </thead>
              <tbody>
                {newPageStructure.map((row: any, i: number) => (
                  <tr key={i} className="border-b border-border/20 last:border-0 align-top">
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${pacesColor(row.step)}`}>
                        {row.step}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-foreground/90 font-medium">{row.sectionName}</td>
                    <td className="py-2 px-3 text-foreground/80">
                      <p className="font-medium">{row.headline}</p>
                      {row.subCopy && <p className="text-muted-foreground mt-0.5">{row.subCopy}</p>}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{row.visual}</td>
                    <td className="py-2 px-3 text-muted-foreground">{row.whyNeeded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Image direction list */}
      {imageDirectionList.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-xs text-primary">3</span>
            이미지/GIF 지시서
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium w-10">#</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium w-24">유형</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">촬영 내용</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium w-28">촬영 방향</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium w-28">목적</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium w-20">AI</th>
                </tr>
              </thead>
              <tbody>
                {imageDirectionList.map((row: any, i: number) => (
                  <tr key={i} className="border-b border-border/20 last:border-0 align-top">
                    <td className="py-2 px-3 text-muted-foreground">{row.no || i+1}</td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                        row.type?.includes("GIF") ? "bg-purple-500/15 text-purple-400 border-purple-500/30" :
                        row.type?.includes("영상") || row.type?.includes("video") ? "bg-red-500/15 text-red-400 border-red-500/30" :
                        "bg-blue-500/15 text-blue-400 border-blue-500/30"
                      }`}>{row.type}</span>
                    </td>
                    <td className="py-2 px-3 text-foreground/80">{row.content}</td>
                    <td className="py-2 px-3 text-muted-foreground">{row.direction}</td>
                    <td className="py-2 px-3 text-muted-foreground">{row.purpose}</td>
                    <td className="py-2 px-3">
                      {row.aiPrompt && (
                        <button
                          onClick={() => setExpandedPrompts(prev => ({ ...prev, [i]: !prev[i] }))}
                          className="text-primary text-[10px] hover:underline"
                        >
                          {expandedPrompts[i] ? "접기" : "보기"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Expanded prompts */}
          {Object.entries(expandedPrompts).filter(([, v]) => v).map(([idx]) => {
            const row = imageDirectionList[parseInt(idx)];
            if (!row?.aiPrompt) return null;
            return (
              <div key={idx} className="bg-muted/30 rounded-lg p-3 border border-border/30 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground font-mono">#{parseInt(idx)+1} AI 프롬프트</p>
                  <button onClick={() => navigator.clipboard.writeText(row.aiPrompt)} className="text-[10px] text-primary hover:underline">복사</button>
                </div>
                <p className="text-xs text-primary/90 font-mono leading-relaxed">{row.aiPrompt}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Core Variables */}
      {coreVars && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-xs text-primary">4</span>
            생성용 핵심 변수 10개
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {coreVariableLabels.map(({ key, label }) => {
              const val = coreVars[key];
              if (!val) return null;
              const display = Array.isArray(val)
                ? val.map((v: any) => typeof v === "object" ? `Q: ${v.q}\nA: ${v.a}` : String(v)).join("\n")
                : String(val);
              return (
                <div key={key} className="bg-muted/30 rounded-xl p-3 border border-border/30 space-y-1">
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">{label}</p>
                  <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">{display}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab4: Product Memo ────────────────────────────────────────────────────────
const MEMO_FIELDS = [
  { key: "targetCustomer", label: "타깃 고객", coreKey: "targetCustomer" },
  { key: "coreProblem", label: "핵심 문제 상황", coreKey: "coreProblem" },
  { key: "strongestSellingPoint", label: "가장 강한 판매 포인트", coreKey: "strongestSellingPoint" },
  { key: "hesitationReasons", label: "고객 망설임 이유", coreKey: "hesitationReasons" },
  { key: "trustEvidence", label: "신뢰를 줄 근거", coreKey: "trustEvidence" },
  { key: "reviewHighlights", label: "강조할 리뷰 포인트", coreKey: "reviewHighlights" },
  { key: "mustShowScenes", label: "꼭 보여줄 사용 장면", coreKey: "mustShowScenes" },
  { key: "mustHaveFAQ", label: "꼭 필요한 FAQ", coreKey: "mustHaveFAQ" },
  { key: "toneAndManner", label: "적합한 톤앤매너", coreKey: "toneAndManner" },
  { key: "persuasionStructure", label: "추천 설득 구조", coreKey: "persuasionStructure" },
];

function Tab4Memo({ result, analysisId, onGoToTab5 }: { result: any; analysisId: string; onGoToTab5: () => void }) {
  const storageKey = `pageiq_memo_${analysisId}`;
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [savedFlags, setSavedFlags] = useState<Record<string, boolean>>({});

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setMemos(JSON.parse(stored));
    } catch {
      // ignore parse errors
    }
  }, [storageKey]);

  const saveMemo = useCallback((key: string, value: string) => {
    const updated = { ...memos, [key]: value };
    setMemos(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setSavedFlags(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setSavedFlags(prev => ({ ...prev, [key]: false })), 2000);
  }, [memos, storageKey]);

  // Extract initial value from analysis for auto-fill
  const getAutoFill = useCallback((coreKey: string): string => {
    const level3Vars = result?.level3?.coreVariables;
    const guideVars = result?.improvementGuide?.coreVariables;
    const vars = level3Vars || guideVars;
    if (!vars) return "";
    const val = vars[coreKey];
    if (!val) return "";
    if (Array.isArray(val)) {
      return val.map((v: any) => typeof v === "object" ? `Q: ${v.q}\nA: ${v.a}` : String(v)).join("\n");
    }
    return String(val);
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">제품 메모</p>
          <p className="text-xs text-muted-foreground">분석 결과를 기반으로 핵심 정보를 정리하고, 상세페이지 생성에 반영하세요</p>
        </div>
        <Button size="sm" onClick={onGoToTab5} className="text-xs h-8">
          메모 내용을 상세페이지 생성에 반영 →
        </Button>
      </div>

      {/* Memo cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MEMO_FIELDS.map(({ key, label, coreKey }) => (
          <div key={key} className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <div className="flex items-center gap-2">
                {savedFlags[key] && <span className="text-[10px] text-green-400">저장됨</span>}
                <button
                  onClick={() => {
                    const val = getAutoFill(coreKey);
                    if (val) {
                      setMemos(prev => ({ ...prev, [key]: val }));
                    }
                  }}
                  className="text-[10px] text-primary hover:underline"
                >
                  AI 초안 채우기
                </button>
              </div>
            </div>
            <textarea
              className="w-full bg-muted/30 border border-border/30 rounded-lg p-2.5 text-xs text-foreground/80 leading-relaxed resize-y min-h-[80px] focus:outline-none focus:border-primary/50 transition-colors"
              value={memos[key] || ""}
              onChange={(e) => setMemos(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder={`${label}을(를) 입력하세요...`}
            />
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => saveMemo(key, memos[key] || "")}
            >
              저장
            </Button>
          </div>
        ))}
      </div>

      {/* Cost info */}
      <div className="bg-muted/30 border border-border/30 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">예상 비용 안내</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="space-y-0.5">
            <p className="text-muted-foreground">분석 1회</p>
            <p className="text-foreground font-medium">약 200~300원</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-muted-foreground">개선가이드</p>
            <p className="text-foreground font-medium">약 130원</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-muted-foreground">상세페이지 생성</p>
            <p className="text-foreground font-medium">약 200~300원</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-muted-foreground">총 1회 파이프라인</p>
            <p className="text-primary font-bold">약 500~700원</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab5: Page Generator (Improvement) ────────────────────────────────────────
function VisualItemCard5({ item }: { item: VisualItem }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const vi = item as any;

  const typeColor = item.type === "video" ? "bg-red-500/10 text-red-400 border-red-500/20" :
    item.type === "gif" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
    "bg-green-500/10 text-green-400 border-green-500/20";
  const priorityColor = item.priority === "필수" ? "text-red-400 bg-red-500/10 border-red-500/20" :
    item.priority === "권장" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" :
    "text-muted-foreground bg-muted/40 border-border/30";

  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full border font-mono uppercase ${typeColor}`}>{item.type}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor}`}>{item.priority}</span>
        <span className="text-xs text-muted-foreground ml-auto">{item.size}</span>
      </div>
      <p className="text-xs text-foreground/80 leading-relaxed">{item.description}</p>
      {vi.shootingDirection && (
        <div className="flex gap-2 text-xs">
          <span className="text-muted-foreground shrink-0">촬영 방향:</span>
          <span className="text-foreground/70">{vi.shootingDirection}</span>
        </div>
      )}
      {vi.replaceInstructions && (
        <div className="flex gap-2 text-xs">
          <span className="text-muted-foreground shrink-0">교체 지침:</span>
          <span className="text-foreground/70">{vi.replaceInstructions}</span>
        </div>
      )}
      <button onClick={() => setShowPrompt(!showPrompt)} className="text-[10px] text-primary hover:underline">
        {showPrompt ? "AI 프롬프트 접기" : "AI 프롬프트 보기"}
      </button>
      {showPrompt && (
        <div className="bg-background/50 rounded p-2 border border-border/30 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-mono">AI 이미지 프롬프트</p>
            <button onClick={() => navigator.clipboard.writeText(item.aiImagePrompt)} className="text-[10px] text-primary hover:underline">복사</button>
          </div>
          <p className="text-xs text-primary/90 leading-relaxed font-mono">{item.aiImagePrompt}</p>
          {item.aiVideoPrompt && (
            <>
              <p className="text-xs text-muted-foreground mt-2 mb-1 font-mono">AI 영상 프롬프트</p>
              <p className="text-xs text-purple-300/90 leading-relaxed font-mono">{item.aiVideoPrompt}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PageSectionCard5({ section }: { section: PageSection }) {
  const [expanded, setExpanded] = useState(false);
  const sec = section as any;

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary font-display">
          {section.order}
        </div>
        {sec.pacesStep && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 mt-1 ${pacesColor(sec.pacesStep)}`}>
            {sec.pacesStep}
          </span>
        )}
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-foreground">{section.sectionName}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{section.purpose}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">{section.visualNeeded?.length || 0}개 비주얼</span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/30">
          <div className="pt-4 space-y-3">
            {/* Purpose */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground font-semibold">목적</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{section.purpose}</p>
            </div>

            {/* Copy: before/after or example */}
            {sec.copyBefore && sec.copyAfter ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-red-400 font-semibold">기존 카피</p>
                  <p className="text-xs text-foreground/70 leading-relaxed whitespace-pre-line">{sec.copyBefore}</p>
                </div>
                <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-green-400 font-semibold">개선 카피</p>
                  <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">{sec.copyAfter}</p>
                </div>
              </div>
            ) : (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
                <p className="text-xs text-primary font-semibold">카피 예시</p>
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">{section.copyExample}</p>
              </div>
            )}

            {/* Content description */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <p className="text-xs text-muted-foreground font-semibold">담아야 할 내용</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{section.contentDescription}</p>
            </div>

            {/* Visual needed */}
            {(section.visualNeeded || []).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-semibold">비주얼 지시서 ({section.visualNeeded?.length || 0}개)</p>
                {(section.visualNeeded || []).map((item, i) => (
                  <VisualItemCard5 key={i} item={item} />
                ))}
              </div>
            )}

            {/* Why improved */}
            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 space-y-1">
              <p className="text-xs text-green-400 font-semibold">왜 개선됐는지</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{section.whyImproved}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tab5Generator({ guide, hasMemo }: { guide: ImprovementGuide; hasMemo: boolean }) {
  const g = guide as any;
  const [priorityTab, setPriorityTab] = useState<"immediate" | "shortTerm" | "midTerm">("immediate");

  return (
    <div className="space-y-6">
      {/* Top banner */}
      <div className="bg-gradient-to-r from-green-500/10 to-primary/10 border border-green-500/20 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">분석 기반 자동 생성됨</Badge>
          <Badge className={`text-xs ${hasMemo ? "bg-primary/20 text-primary border-primary/30" : "bg-muted/40 text-muted-foreground border-border/30"}`}>
            {hasMemo ? "메모 내용 반영됨" : "메모 내용 반영 안 됨"}
          </Badge>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card border border-primary/20 rounded-xl p-5">
        <p className="text-xs text-muted-foreground mb-1">핵심 개선 방향</p>
        <p className="text-sm font-semibold text-foreground">{guide.summary}</p>
      </div>

      {/* Difference from original */}
      {(guide.differenceFromOriginal || []).length > 0 && (
        <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            기존 대비 개선 포인트 ({guide.differenceFromOriginal.length}개)
          </h4>
          <ul className="space-y-2">
            {guide.differenceFromOriginal.map((point, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground/80">
                <span className="text-primary shrink-0 font-bold">→</span>{point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Target Persona */}
      <div className="bg-card border border-primary/20 rounded-xl p-5 space-y-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">타겟 페르소나</h4>
        <p className="text-sm text-foreground/90 leading-relaxed">{guide.targetPersona?.description}</p>
        {g.targetPersona?.persona && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <p className="text-[10px] text-muted-foreground font-semibold">페르소나</p>
            <p className="text-xs text-foreground/80">{g.targetPersona.persona}</p>
          </div>
        )}
        {(g.targetPersona?.scenarios || []).length > 0 && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <p className="text-[10px] text-muted-foreground font-semibold">시나리오</p>
            <ul className="space-y-1">
              {g.targetPersona.scenarios.map((s: string, i: number) => (
                <li key={i} className="text-xs text-foreground/80 flex gap-2"><span className="text-primary shrink-0">-</span>{s}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 space-y-1">
            <p className="text-[10px] text-red-400 font-semibold">Pain Points</p>
            <ul className="space-y-1">
              {(guide.targetPersona?.painPoints || []).map((p, i) => (
                <li key={i} className="text-xs text-foreground/80 flex gap-2"><span className="text-red-400 shrink-0">-</span>{p}</li>
              ))}
            </ul>
          </div>
          <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3 space-y-1">
            <p className="text-[10px] text-green-400 font-semibold">원하는 결과</p>
            <p className="text-xs text-foreground/80">{guide.targetPersona?.desiredOutcome}</p>
          </div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 space-y-1">
          <p className="text-[10px] text-muted-foreground font-semibold">톤앤매너</p>
          <p className="text-xs text-primary font-medium">{guide.targetPersona?.toneAndManner}</p>
        </div>
      </div>

      {/* Improvement Priority */}
      {g.improvementPriority && (
        <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">개선 우선순위</h4>
          <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
            {([
              { key: "immediate" as const, label: "즉시", color: "text-red-400" },
              { key: "shortTerm" as const, label: "단기", color: "text-yellow-400" },
              { key: "midTerm" as const, label: "중기", color: "text-blue-400" },
            ]).map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => setPriorityTab(key)}
                className={`flex-1 text-xs py-2 rounded-md transition-colors font-medium ${
                  priorityTab === key
                    ? "bg-background text-foreground border border-border/50 shadow-sm"
                    : `${color} hover:text-foreground`
                }`}
              >
                {label} ({(g.improvementPriority[key] || []).length})
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {(g.improvementPriority[priorityTab] || []).map((item: any, i: number) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{i+1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground/90 font-medium">{item.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.expectedEffect}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PACES Section Cards */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          PACES 섹션별 상세 ({(guide.pageStructure || []).length}개 섹션)
        </h4>
        <p className="text-xs text-muted-foreground">섹션을 클릭하면 카피 예시, 비주얼 명세서, AI 프롬프트가 펼쳐집니다</p>
        {(guide.pageStructure || []).map((section, i) => (
          <PageSectionCard5 key={i} section={section} />
        ))}
      </div>

      {/* Copywriting guide */}
      {guide.copywriting && (
        <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">카피라이팅 가이드</h4>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase">메인 헤드라인</p>
              <p className="text-base font-bold text-primary font-display">{guide.copywriting.mainHeadline}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase">서브 헤드라인</p>
              <p className="text-sm text-foreground/90">{guide.copywriting.subHeadline}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase">핵심 혜택</p>
              <ul className="space-y-1">
                {(guide.copywriting.keyBenefits || []).map((b, i) => (
                  <li key={i} className="text-xs text-foreground/80 flex gap-2"><span className="text-green-400 shrink-0">-</span>{b}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase">CTA 문구</p>
              <div className="inline-block bg-primary/10 border border-primary/30 rounded-lg px-4 py-2">
                <p className="text-sm font-bold text-primary">{guide.copywriting.ctaText}</p>
              </div>
            </div>
            {(guide.copywriting.faqItems || []).length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase">FAQ</p>
                {guide.copywriting.faqItems.map((faq, i) => (
                  <div key={i} className="border-b border-border/30 pb-2 last:border-0">
                    <p className="text-xs font-medium text-foreground">Q. {faq.question}</p>
                    <p className="text-xs text-muted-foreground">A. {faq.answer}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase">신뢰 강화 문구</p>
              <p className="text-xs text-foreground/80 bg-muted/30 rounded-lg p-2">{guide.copywriting.trustStatement}</p>
            </div>
          </div>
        </div>
      )}

      {/* Visual guide */}
      {guide.visualGuide && (
        <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">비주얼 가이드</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <p className="text-[10px] text-muted-foreground">컬러 팔레트</p>
              <div className="space-y-1">
                {(guide.visualGuide.colorPalette || []).map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-border" style={{ background: c.match(/#[0-9a-fA-F]{6}/)?.[0] || "hsl(210 10% 40%)" }}/>
                    <span className="text-xs text-foreground/70">{c}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <p className="text-[10px] text-muted-foreground">폰트 스타일</p>
              <p className="text-xs text-foreground/80">{guide.visualGuide.fontStyle}</p>
            </div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <p className="text-[10px] text-muted-foreground">이미지 톤</p>
            <p className="text-xs text-foreground/80">{guide.visualGuide.imageTone}</p>
          </div>
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 space-y-1">
            <p className="text-[10px] text-muted-foreground">전체 분위기</p>
            <p className="text-xs text-primary font-medium">{guide.visualGuide.overallMood}</p>
          </div>
        </div>
      )}

      {/* Estimated cost */}
      {g.estimatedCost && (
        <div className="bg-muted/30 border border-border/30 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">예상 비용</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><p className="text-muted-foreground">분석 GPT</p><p className="text-foreground font-medium">{g.estimatedCost.analysisGPT}</p></div>
            <div><p className="text-muted-foreground">개선 GPT</p><p className="text-foreground font-medium">{g.estimatedCost.improvementGPT}</p></div>
            <div><p className="text-muted-foreground">생성 GPT</p><p className="text-foreground font-medium">{g.estimatedCost.pageGenerationGPT}</p></div>
            <div><p className="text-muted-foreground">총 비용</p><p className="text-primary font-bold">{g.estimatedCost.totalPerSession}</p></div>
          </div>
          {g.estimatedCost.note && <p className="text-xs text-muted-foreground">{g.estimatedCost.note}</p>}
        </div>
      )}
    </div>
  );
}

// ── Tab6: External Data ───────────────────────────────────────────────────────
function NaverSection({ naver, productName }: { naver: ExternalSearchData["naver"]; productName: string }) {
  if (!naver) return (
    <div className="text-center py-8 text-muted-foreground text-sm">네이버 데이터를 수집하지 못했습니다</div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-muted/40 rounded-xl p-4 text-center space-y-1">
          <p className="text-xs text-muted-foreground">블로그 포스팅</p>
          <p className="text-xl font-bold text-foreground font-display">{formatNumber(naver.totalBlogCount)}</p>
          <p className="text-xs text-muted-foreground">건 검색됨</p>
        </div>
        <div className="bg-muted/40 rounded-xl p-4 text-center space-y-1">
          <p className="text-xs text-muted-foreground">카페 포스팅</p>
          <p className="text-xl font-bold text-foreground font-display">{formatNumber(naver.totalCafeCount)}</p>
          <p className="text-xs text-muted-foreground">건 검색됨</p>
        </div>
        <div className={`rounded-xl p-4 text-center space-y-1 ${naver.isGroupBuyDetected ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-muted/40"}`}>
          <p className="text-xs text-muted-foreground">공동구매</p>
          <p className={`text-xl font-bold font-display ${naver.isGroupBuyDetected ? "text-yellow-400" : "text-foreground"}`}>
            {naver.isGroupBuyDetected ? "감지됨" : "없음"}
          </p>
          {naver.isGroupBuyDetected && (
            <p className="text-xs text-yellow-400">{naver.groupBuyKeywords.slice(0,2).join(", ")}</p>
          )}
        </div>
        <div className={`rounded-xl p-4 text-center space-y-1 ${naver.isPaidReviewDetected ? "bg-orange-500/10 border border-orange-500/20" : "bg-muted/40"}`}>
          <p className="text-xs text-muted-foreground">협찬/광고 비율</p>
          <p className={`text-xl font-bold font-display ${naver.isPaidReviewDetected ? "text-orange-400" : "text-green-400"}`}>
            {naver.isPaidReviewDetected ? "높음" : "정상"}
          </p>
          <p className="text-xs text-muted-foreground">{naver.isPaidReviewDetected ? "신뢰도 주의" : "자연 리뷰 많음"}</p>
        </div>
      </div>

      {Object.keys(naver.blogDateDistribution).length > 0 && (
        <div className="bg-muted/30 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">월별 블로그 포스팅 추이</p>
          <div className="flex items-end gap-1 h-14">
            {Object.entries(naver.blogDateDistribution)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .slice(-6)
              .map(([month, count]) => {
                const max = Math.max(...Object.values(naver.blogDateDistribution));
                const pct = max > 0 ? (count / max) * 100 : 0;
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-sm bg-primary/60 transition-all" style={{ height: `${Math.max(4, pct * 0.52)}px` }} title={`${month}: ${count}건`}/>
                    <span className="text-[9px] text-muted-foreground">{month.slice(5)}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {naver.blogPosts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">최근 블로그 포스팅</p>
          <div className="space-y-2">
            {naver.blogPosts.slice(0, 5).map((post, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30 hover:border-primary/20 transition-colors">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs text-primary font-bold">{i+1}</div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-xs font-medium text-foreground truncate">{post.title || "제목 없음"}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{post.description}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatDate(post.postdate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {naver.cafePosts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">카페 포스팅</p>
          <div className="space-y-2">
            {naver.cafePosts.map((post, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-yellow-500/10">
                <div className="text-yellow-400 shrink-0 text-xs mt-0.5">카페</div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-xs font-medium text-foreground truncate">{post.title}</p>
                  <p className="text-xs text-muted-foreground">{post.cafename}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function YouTubeSection({ youtube }: { youtube: ExternalSearchData["youtube"] }) {
  if (!youtube) return (
    <div className="text-center py-8 text-muted-foreground text-sm">유튜브 데이터를 수집하지 못했습니다</div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/40 rounded-xl p-4 text-center space-y-1">
          <p className="text-xs text-muted-foreground">총 영상 수</p>
          <p className="text-xl font-bold text-foreground font-display">{formatNumber(youtube.totalCount)}</p>
          <p className="text-xs text-muted-foreground">개</p>
        </div>
        <div className={`rounded-xl p-4 text-center space-y-1 ${youtube.hasHighViewVideo ? "bg-red-500/10 border border-red-500/20" : "bg-muted/40"}`}>
          <p className="text-xs text-muted-foreground">10만+ 조회수</p>
          <p className={`text-xl font-bold font-display ${youtube.hasHighViewVideo ? "text-red-400" : "text-muted-foreground"}`}>
            {youtube.hasHighViewVideo ? "있음" : "없음"}
          </p>
          <p className="text-xs text-muted-foreground">{youtube.hasHighViewVideo ? "바이럴 가능성 높음" : "아직 미미"}</p>
        </div>
        <div className={`rounded-xl p-4 text-center space-y-1 ${youtube.recentUploadCount > 0 ? "bg-green-500/10 border border-green-500/20" : "bg-muted/40"}`}>
          <p className="text-xs text-muted-foreground">최근 30일 업로드</p>
          <p className={`text-xl font-bold font-display ${youtube.recentUploadCount > 0 ? "text-green-400" : "text-muted-foreground"}`}>
            {youtube.recentUploadCount}
          </p>
          <p className="text-xs text-muted-foreground">개</p>
        </div>
      </div>

      {youtube.videos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">주요 리뷰 영상</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {youtube.videos.slice(0, 6).map((video, i) => {
              const views = parseInt(video.viewCount) || 0;
              const isHot = views >= 100000;
              return (
                <div key={i} className={`flex gap-3 p-3 rounded-xl border transition-colors ${isHot ? "bg-red-500/5 border-red-500/20" : "bg-muted/30 border-border/30"}`}>
                  <div className="w-20 h-14 rounded-lg bg-muted overflow-hidden shrink-0 relative">
                    {video.videoId && !video.videoId.startsWith("mock") ? (
                      <img src={getYouTubeThumbnail(video.videoId)} alt={video.title} className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="hsl(0 72% 51%)">
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2H9v.44A4.83 4.83 0 0 1 5.41 6.69 8 8 0 0 0 2 12c0 4.42 4.48 8 10 8s10-3.58 10-8a8 8 0 0 0-3.41-5.31z"/>
                        </svg>
                      </div>
                    )}
                    {isHot && <div className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold rounded px-1">HOT</div>}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed">{video.title}</p>
                    <p className="text-xs text-muted-foreground">{video.channelTitle}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isHot ? "text-red-400" : "text-primary"}`}>조회 {formatViewCount(video.viewCount)}</span>
                      <span className="text-xs text-muted-foreground">{new Date(video.publishedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "short" })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function InstagramSection({ instagram }: { instagram: ExternalSearchData["instagram"] }) {
  if (!instagram) return (
    <div className="text-center py-8 text-muted-foreground text-sm">인스타그램 데이터를 수집하지 못했습니다</div>
  );

  const viralColor = instagram.viralPossibility === "높음" ? "text-pink-400" :
    instagram.viralPossibility === "중간" ? "text-yellow-400" : "text-muted-foreground";
  const viralBg = instagram.viralPossibility === "높음" ? "bg-pink-500/10 border-pink-500/20" :
    instagram.viralPossibility === "중간" ? "bg-yellow-500/10 border-yellow-500/20" : "bg-muted/40";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-xl p-4 text-center space-y-1 border ${viralBg}`}>
          <p className="text-xs text-muted-foreground">해시태그 게시물</p>
          <p className={`text-xl font-bold font-display ${viralColor}`}>{instagram.estimatedHashtagPosts}</p>
        </div>
        <div className={`rounded-xl p-4 text-center space-y-1 border ${viralBg}`}>
          <p className="text-xs text-muted-foreground">SNS 바이럴 가능성</p>
          <p className={`text-xl font-bold font-display ${viralColor}`}>{instagram.viralPossibility}</p>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">추천 해시태그</p>
        <div className="flex flex-wrap gap-2">
          {instagram.topHashtags.map((tag, i) => (
            <span key={i} className="text-xs px-3 py-1 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20">{tag}</span>
          ))}
        </div>
      </div>
      <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
        <p className="text-xs text-muted-foreground leading-relaxed">{instagram.note}</p>
      </div>
    </div>
  );
}

// ── Main Tabs ─────────────────────────────────────────────────────────────────
type TabKey = "level1" | "level2" | "level3" | "memo" | "generator" | "external";

const TAB_CONFIG: { key: TabKey; label: string; short: string }[] = [
  { key: "level1", label: "레벨1 빠른 진단", short: "L1" },
  { key: "level2", label: "레벨2 모듈 분석", short: "L2" },
  { key: "level3", label: "레벨3 생성 진단", short: "L3" },
  { key: "memo", label: "제품 메모", short: "메모" },
  { key: "generator", label: "상세페이지 생성기", short: "생성" },
  { key: "external", label: "외부 데이터", short: "외부" },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useHashLocation();
  const [activeTab, setActiveTab] = useState<TabKey>("level1");
  const [externalTab, setExternalTab] = useState<"naver" | "youtube" | "instagram">("naver");

  // paste mode
  const isPasteMode = id === "paste";
  const pasteResult = isPasteMode ? getPasteResult() : null;

  const pasteAnalysis: Analysis | null = pasteResult
    ? {
        id: 0,
        url: pasteResult.url || "붙여넣기 분석",
        status: "done",
        result: pasteResult,
        createdAt: new Date(),
      }
    : null;

  const { data: fetchedAnalysis } = useQuery<Analysis>({
    queryKey: ["/api/analyze", id],
    refetchInterval: (query) => {
      const data = query.state.data as Analysis | undefined;
      if (data?.status === "done" || data?.status === "error") return false;
      return 1500;
    },
    enabled: !!id && !isPasteMode,
  });

  const analysis = isPasteMode ? pasteAnalysis : fetchedAnalysis;

  // paste mode redirect
  if (isPasteMode && !pasteResult) {
    setLocation("/");
    return null;
  }

  // Loading
  if (!analysis || analysis.status === "analyzing") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4">
        <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="hsl(210 100% 56%)"/>
          <rect x="6" y="8" width="12" height="2" rx="1" fill="white"/>
          <rect x="6" y="13" width="20" height="2" rx="1" fill="white" opacity="0.7"/>
          <rect x="6" y="18" width="16" height="2" rx="1" fill="white" opacity="0.5"/>
        </svg>
        <div className="text-center space-y-3">
          <h2 className="font-display font-bold text-xl text-foreground">상세페이지 분석 중</h2>
          <p className="text-sm text-muted-foreground">AI 분석 + 네이버/유튜브/인스타 데이터 수집 중...</p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {["주목도 분석", "신뢰도 분석", "전환율 분석", "네이버 검색", "유튜브 조회", "개선 가이드 생성"].map((item, i) => (
              <span key={i} className="pulse-dot text-xs text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1"
                style={{ animationDelay: `${i * 0.25}s` }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (analysis.status === "error") {
    const err = (analysis.result as any)?.error || "알 수 없는 오류";
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-4xl">!</div>
        <h2 className="font-display font-bold text-xl text-foreground">분석 실패</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">{err}</p>
        <Button onClick={() => setLocation("/")} variant="outline">다시 시도</Button>
      </div>
    );
  }

  const result = analysis.result as AnalysisResult;
  if (!result) return null;

  const {
    basicInfo,
    scores,
    modules,
    target,
    topStrengths = [],
    topWeaknesses = [],
    urgentFixes = [],
    oneLinerDiagnosis,
    inflowScenarios = [],
    externalData,
    improvementGuide,
  } = result as any;
  const visualAnalysis = (result as any).visualAnalysis;

  if (!basicInfo || !scores) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-4xl">!</div>
        <h2 className="font-display font-bold text-xl text-foreground">분석 데이터 오류</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {(result as any).error || "분석 결과를 불러오지 못했습니다. 스크린샷을 다시 업로드해주세요."}
        </p>
        <Button onClick={() => setLocation("/")} variant="outline">다시 시도</Button>
      </div>
    );
  }

  const analysisId = String(isPasteMode ? "paste" : id || "0");

  // Check if memo has content
  let hasMemo = false;
  try {
    const stored = localStorage.getItem(`pageiq_memo_${analysisId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      hasMemo = Object.values(parsed).some((v: any) => v && String(v).trim().length > 0);
    }
  } catch {
    // ignore
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border/50 px-6 py-4 sticky top-0 bg-background/80 backdrop-blur z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="hsl(210 100% 56%)"/>
              <rect x="6" y="8" width="12" height="2" rx="1" fill="white"/>
              <rect x="6" y="13" width="20" height="2" rx="1" fill="white" opacity="0.7"/>
              <rect x="6" y="18" width="16" height="2" rx="1" fill="white" opacity="0.5"/>
            </svg>
            <span className="font-display font-bold text-base text-foreground">PageIQ</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLocation("/")} className="text-xs h-8">
            새 분석
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Product info bar */}
        <div className="fade-in-up flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <ScoreRing score={scores.overall} size={48}/>
            <div>
              <p className="text-sm font-semibold text-foreground truncate max-w-xs">{basicInfo.productName}</p>
              <p className="text-xs text-muted-foreground truncate max-w-xs">{analysis.url}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span>{basicInfo.price}</span>
            {basicInfo.rating && <span>| {basicInfo.rating}</span>}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="fade-in-up sticky top-[65px] z-10 bg-background/80 backdrop-blur -mx-4 px-4 py-2">
          <div className="flex gap-1 bg-muted/30 rounded-xl p-1 overflow-x-auto">
            {TAB_CONFIG.map(({ key, label, short }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 min-w-0 text-xs py-2.5 px-2 rounded-lg transition-colors font-medium whitespace-nowrap ${
                  activeTab === key
                    ? "bg-background text-foreground border border-border/50 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="hidden md:inline">{label}</span>
                <span className="md:hidden">{short}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "level1" && (
          <Tab1Level1
            scores={scores}
            oneLinerDiagnosis={oneLinerDiagnosis}
            topStrengths={topStrengths}
            topWeaknesses={topWeaknesses}
            urgentFixes={urgentFixes}
          />
        )}

        {activeTab === "level2" && (
          <Tab2Modules modules={modules} />
        )}

        {activeTab === "level3" && (
          <Tab3Level3 result={result} />
        )}

        {activeTab === "memo" && (
          <Tab4Memo
            result={result}
            analysisId={analysisId}
            onGoToTab5={() => setActiveTab("generator")}
          />
        )}

        {activeTab === "generator" && (
          improvementGuide ? (
            <Tab5Generator guide={improvementGuide} hasMemo={hasMemo} />
          ) : (
            <div className="text-center py-16 space-y-3">
              <p className="text-lg text-muted-foreground">개선 가이드가 아직 생성되지 않았습니다</p>
              <p className="text-xs text-muted-foreground">분석이 완료되면 자동으로 생성됩니다</p>
            </div>
          )
        )}

        {activeTab === "external" && (
          externalData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-display font-bold text-base text-foreground">외부 채널 데이터</h2>
                <span className="text-xs text-muted-foreground">
                  검색어: <span className="text-primary">{externalData.productName}</span> · {new Date(externalData.collectedAt).toLocaleDateString("ko-KR")}
                </span>
              </div>
              <div className="flex gap-1 bg-muted/30 rounded-xl p-1">
                {([
                  { key: "naver" as const, label: "네이버", dot: "bg-green-400" },
                  { key: "youtube" as const, label: "유튜브", dot: "bg-red-400" },
                  { key: "instagram" as const, label: "인스타그램", dot: "bg-pink-400" },
                ]).map(({ key, label, dot }) => (
                  <button
                    key={key}
                    onClick={() => setExternalTab(key)}
                    className={`flex-1 text-xs py-2.5 rounded-lg transition-colors font-medium flex items-center justify-center gap-1.5 ${
                      externalTab === key
                        ? "bg-background text-foreground border border-border/50 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`}/>
                    {label}
                  </button>
                ))}
              </div>
              {externalTab === "naver" && <NaverSection naver={externalData.naver} productName={externalData.productName} />}
              {externalTab === "youtube" && <YouTubeSection youtube={externalData.youtube} />}
              {externalTab === "instagram" && <InstagramSection instagram={externalData.instagram} />}
            </div>
          ) : (
            <div className="text-center py-16 space-y-3">
              <p className="text-lg text-muted-foreground">외부 데이터가 아직 수집되지 않았습니다</p>
              <p className="text-xs text-muted-foreground">분석이 완료되면 자동으로 수집됩니다</p>
            </div>
          )
        )}

        {/* Visual Analysis (shown below tabs if present, on level1/level2) */}
        {visualAnalysis && (activeTab === "level1" || activeTab === "level2") && (
          <div className="fade-in-up bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(270 80% 65%)" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-foreground">비주얼 분석 (AI Vision)</h2>
                <p className="text-xs text-muted-foreground">업로드된 스크린샷을 GPT-4o가 직접 분석한 결과</p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-3 border border-purple-500/10">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">첫 화면 임팩트</p>
                <div className="flex gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                    visualAnalysis.hasVideo ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-muted/50 text-muted-foreground border-border/50"
                  }`}>{visualAnalysis.hasVideo ? "영상 있음" : "영상 없음"}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                    visualAnalysis.hasGif ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-muted/50 text-muted-foreground border-border/50"
                  }`}>{visualAnalysis.hasGif ? "GIF 있음" : "GIF 없음"}</span>
                  {visualAnalysis.mobileOptimized !== null && (
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                      visualAnalysis.mobileOptimized ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    }`}>{visualAnalysis.mobileOptimized ? "모바일 최적화" : "모바일 개선 필요"}</span>
                  )}
                </div>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{visualAnalysis.firstScreenImpact}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-xl p-4 space-y-2 border border-border/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"/>이미지 품질 평가
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">{visualAnalysis.imageQuality}</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 space-y-2 border border-border/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block"/>레이아웃 흐름
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">{visualAnalysis.layoutFlow}</p>
              </div>
            </div>

            {visualAnalysis.colorTone && (
              <div className="bg-muted/30 rounded-xl p-4 space-y-2 border border-border/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 inline-block"/>색감/톤 분석
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">{visualAnalysis.colorTone}</p>
              </div>
            )}

            {visualAnalysis.copyInImages && visualAnalysis.copyInImages.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">이미지 내 발견된 카피 문구</p>
                <div className="flex flex-wrap gap-2">
                  {(visualAnalysis.copyInImages as string[]).map((copy: string, i: number) => (
                    <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 leading-relaxed">
                      &ldquo;{copy}&rdquo;
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Target profile + Inflow scenarios (shown on level1) */}
        {activeTab === "level1" && (
          <>
            <div className="fade-in-up bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-base text-foreground">추정 타겟 고객 프로필</h2>
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                  신뢰도 {target?.confidence || 0}%
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "성별", value: target?.gender },
                  { label: "연령대", value: target?.ageGroup },
                  { label: "직업", value: target?.occupation },
                  { label: "지역", value: target?.region },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/50 rounded-xl p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-semibold text-foreground">{value || "-"}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-xl p-3 space-y-1 border border-green-500/10">
                  <p className="text-xs text-muted-foreground">구매 동기</p>
                  <p className="text-sm text-foreground">{target?.buyingMotivation}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3 space-y-1 border border-red-500/10">
                  <p className="text-xs text-muted-foreground">구매 장벽</p>
                  <p className="text-sm text-foreground">{target?.buyingBarrier}</p>
                </div>
              </div>
              {target?.persona && (
                <div className="bg-muted/30 rounded-xl p-3 space-y-1 border border-primary/10">
                  <p className="text-xs text-muted-foreground">페르소나</p>
                  <p className="text-sm text-foreground">{target.persona}</p>
                </div>
              )}
              {(target?.scenarios || []).length > 0 && (
                <div className="bg-muted/30 rounded-xl p-3 space-y-1 border border-primary/10">
                  <p className="text-xs text-muted-foreground">시나리오</p>
                  <ul className="space-y-1">
                    {target.scenarios.map((s: string, i: number) => (
                      <li key={i} className="text-xs text-foreground/80 flex gap-2"><span className="text-primary shrink-0">-</span>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {inflowScenarios.length > 0 && (
              <div className="fade-in-up bg-card border border-border rounded-2xl p-6 space-y-4">
                <h2 className="font-display font-bold text-base text-foreground">유입 경로 가능성 추론</h2>
                <div className="space-y-3">
                  {inflowScenarios.map((scenario: any, i: number) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                      <div className="shrink-0 w-16 text-center">
                        <Badge className={`text-xs ${
                          scenario.probability === "높음" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          scenario.probability === "중간" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                          "bg-muted text-muted-foreground border-border"
                        }`}>{scenario.probability}</Badge>
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{scenario.type}</p>
                        <p className="text-xs text-muted-foreground">{scenario.reason}</p>
                        <p className="text-xs text-primary">{scenario.channel}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Basic info */}
            <div className="fade-in-up bg-card border border-border rounded-2xl p-6 space-y-4">
              <h2 className="font-display font-bold text-base text-foreground">상품 기본 정보</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "상품명", value: basicInfo.productName },
                  { label: "가격", value: basicInfo.price },
                  { label: "할인", value: basicInfo.discount },
                  { label: "평점", value: `${basicInfo.rating} (${basicInfo.reviewCount} 리뷰)` },
                  { label: "카테고리", value: basicInfo.category },
                  { label: "판매자", value: basicInfo.seller },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted/40 rounded-xl p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-foreground truncate">{value}</p>
                  </div>
                ))}
              </div>
              {basicInfo.options?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">옵션</p>
                  <div className="flex flex-wrap gap-2">
                    {basicInfo.options.map((opt: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{opt}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-border/30 py-4 text-center mt-8">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary transition-colors">
          Created with Perplexity Computer
        </a>
      </footer>
    </div>
  );
}
