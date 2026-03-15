import { useParams } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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

// ── Module Card ───────────────────────────────────────────────────────────────
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

function ModuleCard({ name, data }: { name: string; data: ModuleResult }) {
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${scoreBg(data.score)}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{MODULE_NAMES[name] || name}</span>
        <span className={`text-lg font-bold font-display ${scoreColor(data.score)}`}>{data.score}</span>
      </div>

      <div className="h-1 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${data.score}%`,
            background: data.score >= 70 ? "hsl(142 76% 45%)" : data.score >= 45 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)"
          }}
        />
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex gap-2">
          <span className="text-muted-foreground shrink-0">현재</span>
          <span className="text-foreground/80">{data.currentState}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-muted-foreground shrink-0">문제</span>
          <span className="text-foreground/80">{data.problem}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-primary shrink-0">개선</span>
          <span className="text-foreground/80">{data.improvement}</span>
        </div>
        {data.example && (
          <div className="bg-muted/50 rounded-lg px-3 py-2 font-mono text-xs text-primary/90 border border-border/50">
            {data.example}
          </div>
        )}
      </div>
    </div>
  );
}

// ── External Data Section ─────────────────────────────────────────────────────
function NaverSection({ naver, productName }: { naver: ExternalSearchData["naver"]; productName: string }) {
  if (!naver) return (
    <div className="text-center py-8 text-muted-foreground text-sm">네이버 데이터를 수집하지 못했습니다</div>
  );

  return (
    <div className="space-y-5">
      {/* Stats row */}
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
            {naver.isPaidReviewDetected ? "높음 ⚠" : "정상"}
          </p>
          <p className="text-xs text-muted-foreground">{naver.isPaidReviewDetected ? "신뢰도 주의" : "자연 리뷰 많음"}</p>
        </div>
      </div>

      {/* Date distribution */}
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
                    <div
                      className="w-full rounded-sm bg-primary/60 transition-all"
                      style={{ height: `${Math.max(4, pct * 0.52)}px` }}
                      title={`${month}: ${count}건`}
                    />
                    <span className="text-[9px] text-muted-foreground">{month.slice(5)}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Recent blog posts */}
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

      {/* Cafe posts */}
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
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/40 rounded-xl p-4 text-center space-y-1">
          <p className="text-xs text-muted-foreground">총 영상 수</p>
          <p className="text-xl font-bold text-foreground font-display">{formatNumber(youtube.totalCount)}</p>
          <p className="text-xs text-muted-foreground">개</p>
        </div>
        <div className={`rounded-xl p-4 text-center space-y-1 ${youtube.hasHighViewVideo ? "bg-red-500/10 border border-red-500/20" : "bg-muted/40"}`}>
          <p className="text-xs text-muted-foreground">10만+ 조회수</p>
          <p className={`text-xl font-bold font-display ${youtube.hasHighViewVideo ? "text-red-400" : "text-muted-foreground"}`}>
            {youtube.hasHighViewVideo ? "있음 🔥" : "없음"}
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

      {/* Video list */}
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
                      <img
                        src={getYouTubeThumbnail(video.videoId)}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="hsl(0 72% 51%)">
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2H9v.44A4.83 4.83 0 0 1 5.41 6.69 8 8 0 0 0 2 12c0 4.42 4.48 8 10 8s10-3.58 10-8a8 8 0 0 0-3.41-5.31z"/>
                        </svg>
                      </div>
                    )}
                    {isHot && (
                      <div className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold rounded px-1">HOT</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed">{video.title}</p>
                    <p className="text-xs text-muted-foreground">{video.channelTitle}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isHot ? "text-red-400" : "text-primary"}`}>
                        조회 {formatViewCount(video.viewCount)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(video.publishedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "short" })}
                      </span>
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
      {/* Stats */}
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

      {/* Hashtags */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">추천 해시태그</p>
        <div className="flex flex-wrap gap-2">
          {instagram.topHashtags.map((tag, i) => (
            <span key={i} className="text-xs px-3 py-1 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
        <p className="text-xs text-muted-foreground leading-relaxed">{instagram.note}</p>
      </div>
    </div>
  );
}

// ── Improvement Guide Section ─────────────────────────────────────────────────
function VisualItemCard({ item }: { item: VisualItem }) {
  const typeColor = item.type === "video" ? "bg-red-500/10 text-red-400 border-red-500/20" :
    item.type === "gif" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
    "bg-blue-500/10 text-blue-400 border-blue-500/20";
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
      <div className="bg-background/50 rounded p-2 border border-border/30">
        <p className="text-xs text-muted-foreground mb-1 font-mono">AI 이미지 프롬프트</p>
        <p className="text-xs text-primary/90 leading-relaxed font-mono">{item.aiImagePrompt}</p>
        {item.aiVideoPrompt && (
          <>
            <p className="text-xs text-muted-foreground mt-2 mb-1 font-mono">AI 영상 프롬프트</p>
            <p className="text-xs text-purple-300/90 leading-relaxed font-mono">{item.aiVideoPrompt}</p>
          </>
        )}
      </div>
    </div>
  );
}

function PageSectionCard({ section }: { section: PageSection }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary font-display">
          {section.order}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
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
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                <p className="text-xs text-muted-foreground font-semibold">목적</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{section.purpose}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                <p className="text-xs text-muted-foreground font-semibold">담아야 할 내용</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{section.contentDescription}</p>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
                <p className="text-xs text-primary font-semibold">카피 예시</p>
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">{section.copyExample}</p>
              </div>
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 space-y-1">
                <p className="text-xs text-green-400 font-semibold">기존 대비 개선 이유</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{section.whyImproved}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-semibold">필요한 비주얼 ({section.visualNeeded?.length || 0}개)</p>
              {(section.visualNeeded || []).map((item, i) => (
                <VisualItemCard key={i} item={item} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImprovementGuideSection({ guide }: { guide: ImprovementGuide }) {
  const [activeTab, setActiveTab] = useState<"structure" | "copy" | "visual" | "persona">("structure");

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(210 100% 56%)" strokeWidth="2">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">핵심 개선 방향</p>
            <p className="text-sm font-semibold text-foreground">{guide.summary}</p>
          </div>
        </div>
      </div>

      {/* Diff from original */}
      {guide.differenceFromOriginal?.length > 0 && (
        <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">기존 대비 개선 포인트</h4>
          <ul className="space-y-2">
            {guide.differenceFromOriginal.map((point, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground/80">
                <span className="text-primary shrink-0 font-bold">→</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1">
        {([
          { key: "structure", label: "페이지 구조", icon: "⬚" },
          { key: "copy", label: "카피라이팅", icon: "✍" },
          { key: "visual", label: "비주얼 가이드", icon: "🎨" },
          { key: "persona", label: "타겟 페르소나", icon: "👤" },
        ] as const).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 text-xs py-2 rounded-lg transition-colors font-medium ${
              activeTab === key
                ? "bg-background text-foreground border border-border/50 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="hidden sm:inline">{icon} </span>{label}
          </button>
        ))}
      </div>

      {/* Tab contents */}
      {activeTab === "structure" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">섹션을 클릭하면 카피 예시, 비주얼 명세서, AI 프롬프트가 펼쳐집니다</p>
          {(guide.pageStructure || []).map((section, i) => (
            <PageSectionCard key={i} section={section} />
          ))}
        </div>
      )}

      {activeTab === "copy" && (
        <div className="space-y-4">
          <div className="bg-card border border-primary/20 rounded-xl p-5 space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">메인 헤드라인</p>
              <p className="text-lg font-bold text-primary font-display">{guide.copywriting?.mainHeadline}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">서브 헤드라인</p>
              <p className="text-sm text-foreground/90">{guide.copywriting?.subHeadline}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">구매 버튼 문구</p>
              <div className="inline-block bg-primary/10 border border-primary/30 rounded-lg px-4 py-2">
                <p className="text-sm font-bold text-primary">{guide.copywriting?.ctaText}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">핵심 혜택 메시지</p>
            <ul className="space-y-2">
              {(guide.copywriting?.keyBenefits || []).map((b, i) => (
                <li key={i} className="flex gap-3 text-sm text-foreground/80">
                  <span className="text-green-400 shrink-0">✓</span>{b}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">신뢰 강화 문구</p>
            <p className="text-sm text-foreground/90 bg-muted/30 rounded-lg p-3">{guide.copywriting?.trustStatement}</p>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">FAQ 카피</p>
            <div className="space-y-3">
              {(guide.copywriting?.faqItems || []).map((item, i) => (
                <div key={i} className="border-b border-border/30 pb-3 last:border-0 last:pb-0">
                  <p className="text-xs font-semibold text-foreground mb-1">Q. {item.question}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">A. {item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "visual" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">컬러 팔레트</p>
              <div className="space-y-2">
                {(guide.visualGuide?.colorPalette || []).map((color, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-current shrink-0 border border-border"
                      style={{ background: color.match(/#[0-9a-fA-F]{6}/)?.[0] || "hsl(210 10% 40%)" }}/>
                    <p className="text-xs text-foreground/80">{color}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">폰트 스타일</p>
              <p className="text-sm text-foreground/90">{guide.visualGuide?.fontStyle}</p>
            </div>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">이미지 톤</p>
            <p className="text-sm text-foreground/90">{guide.visualGuide?.imageTone}</p>
          </div>
          <div className="bg-card border border-primary/10 rounded-xl p-5 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">전체 분위기</p>
            <p className="text-sm font-semibold text-primary">{guide.visualGuide?.overallMood}</p>
          </div>
        </div>
      )}

      {activeTab === "persona" && (
        <div className="space-y-4">
          <div className="bg-card border border-primary/20 rounded-xl p-5 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">타겟 페르소나</p>
            <p className="text-sm text-foreground/90 leading-relaxed">{guide.targetPersona?.description}</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Pain Points (불편함)</p>
            <ul className="space-y-2">
              {(guide.targetPersona?.painPoints || []).map((p, i) => (
                <li key={i} className="flex gap-3 text-sm text-foreground/80">
                  <span className="text-red-400 shrink-0">•</span>{p}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">원하는 결과</p>
            <p className="text-sm text-foreground/90">{guide.targetPersona?.desiredOutcome}</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-5 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">톤앤매너</p>
            <p className="text-sm font-medium text-primary">{guide.targetPersona?.toneAndManner}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useHashLocation();
  const [externalTab, setExternalTab] = useState<"naver" | "youtube" | "instagram">("naver");

  // paste 모드: 인메모리 store에서 직접 결과 로드
  const isPasteMode = id === "paste";
  const pasteResult = isPasteMode ? getPasteResult() : null;

  const pasteAnalysis: Analysis | null = pasteResult
    ? {
        id: 0,
        url: pasteResult.url || "붙여넣기 분석",
        status: "done",
        result: pasteResult,
        createdAt: new Date().toISOString(),
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

  // paste 모드인데 데이터 없으면 홈으로
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
        <div className="text-4xl">⚠️</div>
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

  // basicInfo 또는 scores 없으면 구조 오류 화면
  if (!basicInfo || !scores) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="font-display font-bold text-xl text-foreground">분석 데이터 오류</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {(result as any).error || "분석 결과를 불러오지 못했습니다. 스크린샷을 다시 업로드해주세요."}
        </p>
        <Button onClick={() => setLocation("/")} variant="outline">다시 시도</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border/50 px-6 py-4 sticky top-0 bg-background/80 backdrop-blur z-10">
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

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* One-liner diagnosis banner */}
        <div className="fade-in-up bg-card border border-primary/20 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(210 100% 56%)" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">판매력 한 줄 진단</p>
              <p className="text-sm font-medium text-foreground">{oneLinerDiagnosis}</p>
              <p className="text-xs text-muted-foreground mt-2 truncate max-w-md">{analysis.url}</p>
            </div>
          </div>
        </div>

        {/* Scores overview */}
        <div className="fade-in-up fade-in-up-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">전체 전환력 점수</p>
            <ScoreRing score={scores.overall} size={120}/>
            <Badge className={`${scoreBg(scores.overall)} text-sm px-3 py-1`}>
              <span className={scoreColor(scores.overall)}>{scoreLabel(scores.overall)}</span>
            </Badge>
            <RadarChart scores={scores}/>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 grid grid-cols-2 gap-3">
            {[
              { key: "attention", label: "주목도" },
              { key: "understanding", label: "이해도" },
              { key: "trust", label: "신뢰도" },
              { key: "appeal", label: "매력도" },
              { key: "anxietyRelief", label: "불안해소도" },
              { key: "conversionPower", label: "구매유도력" },
            ].map(({ key, label }) => {
              const s = scores[key as keyof Scores] as number;
              return (
                <div key={key} className={`rounded-xl border p-3 space-y-2 ${scoreBg(s)}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className={`text-base font-bold font-display ${scoreColor(s)}`}>{s}</span>
                  </div>
                  <div className="h-1 rounded-full bg-border overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${s}%`, background: s >= 70 ? "hsl(142 76% 45%)" : s >= 45 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)" }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths / Weaknesses / Urgent */}
        <div className="fade-in-up fade-in-up-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>강점 TOP 5
            </h3>
            <ul className="space-y-2">
              {topStrengths.map((s, i) => (
                <li key={i} className="text-xs text-foreground/80 flex gap-2">
                  <span className="text-green-500 shrink-0">✓</span>{s}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"/>약점 TOP 5
            </h3>
            <ul className="space-y-2">
              {topWeaknesses.map((w, i) => (
                <li key={i} className="text-xs text-foreground/80 flex gap-2">
                  <span className="text-yellow-500 shrink-0">!</span>{w}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card border border-red-500/20 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>즉시 수정 TOP 3
            </h3>
            <ul className="space-y-2">
              {urgentFixes.map((f, i) => (
                <li key={i} className="text-xs text-foreground/80 flex gap-2">
                  <span className="text-red-400 shrink-0 font-bold">{i + 1}</span>{f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Visual Analysis (GPT-4o Vision) ─── */}
        {visualAnalysis && (
          <div className="fade-in-up fade-in-up-2 bg-card border border-border rounded-2xl p-6 space-y-5">
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

            {/* First screen impact + video/gif badges */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-3 border border-purple-500/10">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">첫 화면 임팩트</p>
                <div className="flex gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                    visualAnalysis.hasVideo
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-muted/50 text-muted-foreground border-border/50"
                  }`}>
                    {visualAnalysis.hasVideo ? "🎬 영상 있음" : "영상 없음"}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                    visualAnalysis.hasGif
                      ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      : "bg-muted/50 text-muted-foreground border-border/50"
                  }`}>
                    {visualAnalysis.hasGif ? "✨ GIF 있음" : "GIF 없음"}
                  </span>
                  {visualAnalysis.mobileOptimized !== null && (
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                      visualAnalysis.mobileOptimized
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    }`}>
                      {visualAnalysis.mobileOptimized ? "📱 모바일 최적화" : "📱 모바일 개선 필요"}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{visualAnalysis.firstScreenImpact}</p>
            </div>

            {/* 2-col grid: image quality + layout flow */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-xl p-4 space-y-2 border border-border/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"/>
                  이미지 품질 평가
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">{visualAnalysis.imageQuality}</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 space-y-2 border border-border/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block"/>
                  레이아웃 흐름
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">{visualAnalysis.layoutFlow}</p>
              </div>
            </div>

            {/* Color tone */}
            {visualAnalysis.colorTone && (
              <div className="bg-muted/30 rounded-xl p-4 space-y-2 border border-border/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 inline-block"/>
                  색감/톤 분석
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">{visualAnalysis.colorTone}</p>
              </div>
            )}

            {/* Copy in images */}
            {visualAnalysis.copyInImages && visualAnalysis.copyInImages.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">이미지 내 발견된 카피 문구</p>
                <div className="flex flex-wrap gap-2">
                  {(visualAnalysis.copyInImages as string[]).map((copy, i) => (
                    <span key={i} className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 leading-relaxed">
                      "{copy}"
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── External Data (Naver/YouTube/Instagram) ─── */}
        {externalData && (
          <div className="fade-in-up fade-in-up-3 bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-display font-bold text-base text-foreground">외부 채널 데이터</h2>
                <span className="text-xs text-muted-foreground">
                  검색어: <span className="text-primary">{externalData.productName}</span> · {new Date(externalData.collectedAt).toLocaleDateString("ko-KR")}
                </span>
              </div>

              {/* Channel tabs */}
              <div className="flex gap-1 bg-muted/30 rounded-xl p-1">
                {([
                  { key: "naver", label: "네이버", color: "text-green-400", dot: "bg-green-400" },
                  { key: "youtube", label: "유튜브", color: "text-red-400", dot: "bg-red-400" },
                  { key: "instagram", label: "인스타그램", color: "text-pink-400", dot: "bg-pink-400" },
                ] as const).map(({ key, label, color, dot }) => (
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
            </div>

            <div className="px-6 pb-6">
              {externalTab === "naver" && <NaverSection naver={externalData.naver} productName={externalData.productName} />}
              {externalTab === "youtube" && <YouTubeSection youtube={externalData.youtube} />}
              {externalTab === "instagram" && <InstagramSection instagram={externalData.instagram} />}
            </div>
          </div>
        )}

        {/* Target profile */}
        <div className="fade-in-up fade-in-up-4 bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-base text-foreground">추정 타겟 고객 프로필</h2>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
              신뢰도 {target.confidence}%
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "성별", value: target.gender },
              { label: "연령대", value: target.ageGroup },
              { label: "직업", value: target.occupation },
              { label: "지역", value: target.region },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/50 rounded-xl p-3 space-y-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-xl p-3 space-y-1 border border-green-500/10">
              <p className="text-xs text-muted-foreground">구매 동기</p>
              <p className="text-sm text-foreground">{target.buyingMotivation}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 space-y-1 border border-red-500/10">
              <p className="text-xs text-muted-foreground">구매 장벽</p>
              <p className="text-sm text-foreground">{target.buyingBarrier}</p>
            </div>
          </div>
        </div>

        {/* Inflow scenarios */}
        <div className="fade-in-up fade-in-up-5 bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-display font-bold text-base text-foreground">유입 경로 가능성 추론</h2>
          <div className="space-y-3">
            {inflowScenarios.map((scenario, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="shrink-0 w-16 text-center">
                  <Badge
                    className={`text-xs ${
                      scenario.probability === "높음"
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : scenario.probability === "중간"
                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}>
                    {scenario.probability}
                  </Badge>
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

        {/* ── Improvement Guide ─── */}
        {improvementGuide && (
          <div className="fade-in-up bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(142 76% 45%)" strokeWidth="2">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-foreground">개선 상세페이지 제작 가이드</h2>
                <p className="text-xs text-muted-foreground">이 분석 결과를 바탕으로 더 잘 팔리는 상세페이지를 만드는 방법</p>
              </div>
            </div>
            <ImprovementGuideSection guide={improvementGuide} />
          </div>
        )}

        {/* 12 Module cards */}
        <div className="fade-in-up space-y-4">
          <h2 className="font-display font-bold text-base text-foreground">12개 모듈 상세 분석</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(modules || {}).map(([key, data]) => (
              <ModuleCard key={key} name={key} data={data as ModuleResult}/>
            ))}
          </div>
        </div>

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
          {basicInfo.options.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">옵션</p>
              <div className="flex flex-wrap gap-2">
                {basicInfo.options.map((opt, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{opt}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
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
