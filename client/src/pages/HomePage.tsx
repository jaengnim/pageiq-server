import { useState, useRef, useCallback } from "react";
import { useHashLocation } from "wouter/use-hash-location";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { setPasteResult } from "@/lib/pasteStore";

type InputMode = "url" | "image";

export default function HomePage() {
  const [, setLocation] = useHashLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<InputMode>("image"); // 기본: 이미지 업로드
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 이미지 추가
  const addImages = useCallback((files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    const next = [...images, ...imageFiles].slice(0, 10);
    setImages(next);
    // 미리보기 생성
    next.forEach((file, i) => {
      if (previews[i]) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => {
          const arr = [...prev];
          arr[i] = e.target?.result as string;
          return arr;
        });
      };
      reader.readAsDataURL(file);
    });
    // 새로 추가된 것만 미리보기
    imageFiles.slice(0, 10 - images.length).forEach((file, idx) => {
      const i = images.length + idx;
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => {
          const arr = [...prev];
          arr[i] = e.target?.result as string;
          return arr;
        });
      };
      reader.readAsDataURL(file);
    });
  }, [images, previews]);

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // 드래그앤드롭
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addImages(Array.from(e.dataTransfer.files));
  };

  // 분석 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "url") {
      if (!url.trim()) { toast({ title: "URL을 입력해주세요", variant: "destructive" }); return; }
      // URL 모드: 기존 /api/analyze
      setIsLoading(true);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim(), apiKey: apiKey.trim() || undefined }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setLocation(`/result/${data.id}`);
      } catch (err: any) {
        toast({ title: "오류", description: err.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 이미지 모드
    if (images.length === 0) {
      toast({ title: "스크린샷을 업로드해주세요", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      images.forEach((img) => formData.append("images", img));
      if (imageUrl.trim()) formData.append("url", imageUrl.trim());
      if (apiKey.trim()) formData.append("apiKey", apiKey.trim());

      const res = await fetch("/api/analyze-images", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const dataWithUrl = { ...data, url: imageUrl.trim() || "스크린샷 분석" };
      setPasteResult(dataWithUrl);
      setLocation("/result/paste");
    } catch (err: any) {
      const msg = err.message || "";
      let friendlyMsg = msg;
      if (msg.includes("이미지 분석 불가") || msg.includes("분석할 수 없")) {
        friendlyMsg = "이미지를 인식하지 못했습니다. 상세페이지 스크린샷(전체 화면 캡처)을 업로드해주세요.";
      } else if (msg.includes("JSON 파싱 실패") || msg.includes("Vision 분석 오류")) {
        friendlyMsg = "AI 분석 중 오류가 발생했습니다. 이미지가 선명한지 확인 후 다시 시도해주세요.";
      } else if (msg.includes("이미지를 하나 이상")) {
        friendlyMsg = "스크린샷을 최소 1장 이상 업로드해주세요.";
      }
      toast({ title: "분석 오류", description: friendlyMsg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="PageIQ Logo">
            <rect width="32" height="32" rx="8" fill="hsl(210 100% 56%)"/>
            <rect x="6" y="8" width="12" height="2" rx="1" fill="white"/>
            <rect x="6" y="13" width="20" height="2" rx="1" fill="white" opacity="0.7"/>
            <rect x="6" y="18" width="16" height="2" rx="1" fill="white" opacity="0.5"/>
            <circle cx="24" cy="22" r="5" fill="hsl(222 25% 7%)"/>
            <path d="M21.5 22L23 23.5L26.5 20" stroke="hsl(210 100% 56%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-display font-bold text-lg tracking-tight text-foreground">PageIQ</span>
          <Badge variant="outline" className="text-xs border-primary/40 text-primary ml-1">Beta</Badge>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-2xl w-full mx-auto text-center space-y-5 fade-in-up">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
            AI 기반 상세페이지 판매력 진단
          </Badge>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-foreground leading-tight">
            상세페이지 스크린샷 하나로<br />
            <span className="text-primary">전환율 문제</span>를 찾아드립니다
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            이미지·카피·레이아웃·비주얼까지 GPT-4o가 직접 보고 분석<br />
            왜 안 팔리는지, 무엇부터 고쳐야 하는지 구체적으로 알려드립니다
          </p>
        </div>

        {/* Input Card */}
        <div className="mt-8 max-w-xl w-full mx-auto fade-in-up fade-in-up-2">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">

            {/* 탭 */}
            <div className="flex bg-muted rounded-xl p-1 mb-5">
              <button type="button" onClick={() => setMode("image")}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${mode === "image" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                data-testid="tab-image">
                📸 스크린샷 업로드
              </button>
              <button type="button" onClick={() => setMode("url")}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${mode === "url" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                data-testid="tab-url">
                🔗 URL로 분석
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {mode === "image" ? (
                <div className="space-y-3">
                  {/* 방법 안내 */}
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-primary">스크린샷 찍는 방법</p>
                    <ol className="text-xs text-muted-foreground space-y-1">
                      <li className="flex gap-2"><span className="text-primary font-bold shrink-0">1</span>크롬에서 분석할 상품 페이지 열기</li>
                      <li className="flex gap-2"><span className="text-primary font-bold shrink-0">2</span>
                        <span>크롬 확장 <strong className="text-foreground">GoFullPage</strong> 설치 후 클릭
                          <a href="https://chromewebstore.google.com/detail/gofullpage-full-page-scre/fdpohaocaechadadgiefce/related" target="_blank" rel="noopener noreferrer"
                            className="ml-1 text-primary underline underline-offset-2">설치 링크 →</a>
                        </span>
                      </li>
                      <li className="flex gap-2"><span className="text-primary font-bold shrink-0">3</span>전체 페이지 스크린샷 저장 후 아래에 업로드</li>
                    </ol>
                    <p className="text-xs text-muted-foreground/70 pt-0.5">또는 일반 캡처 여러 장 나눠서 업로드도 가능 (최대 10장)</p>
                  </div>

                  {/* 상품 URL */}
                  <div className="space-y-1">
                    <Label htmlFor="image-url" className="text-xs font-medium text-muted-foreground">
                      상품 URL <span className="text-muted-foreground/60">(선택사항)</span>
                    </Label>
                    <Input id="image-url" data-testid="input-image-url" type="text"
                      placeholder="https://smartstore.naver.com/..."
                      value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-9 text-xs"
                      disabled={isLoading}
                    />
                  </div>

                  {/* 드래그앤드롭 영역 */}
                  <div
                    onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                      ${isDragging ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/50 hover:bg-muted/50"}`}
                    data-testid="dropzone"
                  >
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => addImages(Array.from(e.target.files || []))}
                    />
                    {images.length === 0 ? (
                      <div className="space-y-2">
                        <div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(210 100% 56%)" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-foreground">스크린샷 드래그 또는 클릭하여 업로드</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, WebP · 최대 10장 · 장당 15MB</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{images.length}장 업로드됨 · 클릭하여 추가</p>
                        <div className="grid grid-cols-4 gap-2">
                          {previews.map((src, i) => src && (
                            <div key={i} className="relative group">
                              <img src={src} alt={`스크린샷 ${i + 1}`}
                                className="w-full h-16 object-cover rounded-lg border border-border/50"/>
                              <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive rounded-full text-white text-xs hidden group-hover:flex items-center justify-center font-bold">
                                ×
                              </button>
                              <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white rounded px-1">{i + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* URL 모드 */
                <div className="space-y-2">
                  <Label htmlFor="url" className="text-sm font-medium text-foreground">상세페이지 URL</Label>
                  <Input id="url" data-testid="input-url" type="url"
                    placeholder="https://smartstore.naver.com/..."
                    value={url} onChange={(e) => setUrl(e.target.value)}
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-12 text-sm"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    ⚠️ 스마트스토어/쿠팡은 서버 차단으로 Mock 결과만 나올 수 있어요. 정확한 분석은 스크린샷 탭을 이용하세요.
                  </p>
                </div>
              )}

              {/* API Key */}
              <div className="space-y-2">
                <button type="button" onClick={() => setShowApiKey(!showApiKey)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                  OpenAI API 키 입력 (선택사항)
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`transition-transform ${showApiKey ? "rotate-180" : ""}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {showApiKey && (
                  <div className="space-y-1">
                    <Input data-testid="input-apikey" type="password" placeholder="sk-..."
                      value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 text-sm font-mono"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      입력하면 GPT-4o로 실제 분석. 없으면 데모 결과로 UI 구조 확인 가능.
                    </p>
                  </div>
                )}
              </div>

              <Button type="submit" data-testid="button-analyze" disabled={isLoading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-xl transition-all">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-primary-foreground inline-block"/>
                      <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-primary-foreground inline-block"/>
                      <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-primary-foreground inline-block"/>
                    </span>
                    GPT-4o 분석 중... (1~2분 소요)
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    판매력 진단 시작
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-10 max-w-2xl w-full mx-auto grid grid-cols-3 gap-4 fade-in-up fade-in-up-3">
          {[
            { icon: "🖼️", title: "비주얼 완전 분석", desc: "이미지·카피·레이아웃·색감까지 GPT-4o가 직접 보고 판단" },
            { icon: "🎯", title: "12개 모듈 진단", desc: "주목도·신뢰도·구매유도력 등 전환율 핵심 요소 점수화" },
            { icon: "📋", title: "제작 지시서 생성", desc: "어떤 이미지·카피·구조로 바꿔야 하는지 구체적으로" },
          ].map((f, i) => (
            <div key={i} className="bg-card border border-border/60 rounded-xl p-4 text-center space-y-2">
              <div className="text-2xl">{f.icon}</div>
              <div className="text-xs font-semibold text-foreground">{f.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/30 py-4 text-center">
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary transition-colors">
          Created with Perplexity Computer
        </a>
      </footer>
    </div>
  );
}
