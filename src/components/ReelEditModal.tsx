import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Video, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import GraphEditorModal from "@/components/GraphEditorModal";
import type { ExtendedPostItem } from "@/data/reelInsightsData";

const SectionTitle = ({ children }: { children: string }) => (
  <h3 className="text-[14px] font-bold text-foreground mt-4 mb-2 uppercase tracking-wide">{children}</h3>
);

const Field = ({ label, value, onChange, type = "number" }: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) => (
  <div className="flex items-center justify-between gap-3 py-1.5">
    <span className="text-[13px] text-foreground flex-shrink-0">{label}</span>
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-[120px] h-8 text-[13px] bg-secondary border-border text-right"
    />
  </div>
);

interface ReelEditModalProps {
  open: boolean;
  onClose: () => void;
  reel: ExtendedPostItem | null;
  reelIndex: number;
  onSave: (index: number, updated: ExtendedPostItem) => void;
  onDelete?: (index: number) => void;
}

const ReelEditModal = ({ open, onClose, reel, reelIndex, onSave, onDelete }: ReelEditModalProps) => {
  const [data, setData] = useState<ExtendedPostItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const musicIconInputRef = useRef<HTMLInputElement>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const sheetContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reel) setData(JSON.parse(JSON.stringify(reel)));
  }, [reel]);

  // Fix mobile keyboard pushing sheet down - prevent viewport resize from closing keyboard
  useEffect(() => {
    if (!open) return;

    // Prevent mobile browser from scrolling/resizing the page when keyboard opens
    const metaViewport = document.querySelector('meta[name=viewport]');
    const originalContent = metaViewport?.getAttribute('content') || '';
    metaViewport?.setAttribute('content', originalContent + ', interactive-widget=resizes-content');

    // Use visualViewport to keep input in view without sheet jumping
    const vv = window.visualViewport;
    if (!vv) return;

    let rafId: number;
    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const el = sheetContentRef.current;
        if (!el) return;
        const keyboardHeight = window.innerHeight - vv.height;
        if (keyboardHeight > 100) {
          // Shrink the sheet to fit above keyboard
          el.style.height = `${vv.height * 0.85}px`;
          el.style.maxHeight = `${vv.height}px`;
          el.style.transform = `translateY(0)`;
          // Keep focused input visible
          const active = document.activeElement as HTMLElement;
          if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
            setTimeout(() => {
              active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }, 50);
          }
        } else {
          el.style.height = '';
          el.style.maxHeight = '';
          el.style.transform = '';
        }
      });
    };

    vv.addEventListener('resize', handleResize);
    return () => {
      vv.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafId);
      metaViewport?.setAttribute('content', originalContent);
    };
  }, [open]);

  if (!data) return null;

  const ins = data.insights;

  const setIns = (key: string, value: any) => {
    setData((prev) => prev ? { ...prev, insights: { ...prev.insights, [key]: value } } : prev);
  };

  const handleSave = () => {
    const fixedData = { ...data };
    fixedData.insights = { ...fixedData.insights, genderFemale: 100 - fixedData.insights.genderMale };
    // Auto-generate thumbnail from streamable video URL only if no custom thumbnail set
    if (fixedData.videoUrl?.includes("streamable.com") && !fixedData.thumbnail) {
      const videoId = fixedData.videoUrl.split("/").pop();
      fixedData.thumbnail = `https://cdn-cf-east.streamable.com/image/${videoId}.jpg`;
    }
    console.log("[ReelEdit] Saving reel", reelIndex, "views:", fixedData.insights.views, "caption:", fixedData.caption?.slice(0, 30));
    onSave(reelIndex, fixedData);
    onClose();
  };


  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent ref={sheetContentRef} side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl bg-background" onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle className="text-[16px] font-bold">Edit Reel #{reelIndex + 1}</SheetTitle>
        </SheetHeader>

        <div className="pb-8 space-y-1">
          {/* Caption */}
          <SectionTitle>Caption</SectionTitle>
          <div className="py-1.5">
            <textarea
              placeholder="Enter caption..."
              value={data.caption || ""}
              onChange={(e) => setData((prev) => prev ? { ...prev, caption: e.target.value } : prev)}
              rows={3}
              className="w-full rounded-md px-3 py-2 text-[13px] bg-secondary border border-border resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Music Title */}
          <SectionTitle>Music</SectionTitle>
          <div className="py-1.5 space-y-2">
            <Input
              type="text"
              placeholder="e.g. Sofia Camara • Ingrained (DN..."
              value={data.musicTitle || ""}
              onChange={(e) => setData((prev) => prev ? { ...prev, musicTitle: e.target.value } : prev)}
              className="h-8 text-[13px] bg-secondary border-border"
            />
            {/* Music Icon Upload */}
            {data.musicTitle && (
              <>
                <span className="text-[12px] text-muted-foreground">Music Cover Art</span>
                {data.musicIcon && (
                  <div className="relative w-10 h-10 rounded-md overflow-hidden border border-border">
                    <img src={data.musicIcon} alt="Music icon" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setData((prev) => prev ? { ...prev, musicIcon: "" } : prev)}
                      className="absolute top-0 right-0 bg-black/60 rounded-full p-0.5"
                    >
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                )}
                <input
                  ref={musicIconInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { alert("Image must be under 2MB"); return; }
                    const reader = new FileReader();
                    reader.onload = (ev) => setData((prev) => prev ? { ...prev, musicIcon: ev.target?.result as string } : prev);
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-[13px]"
                  onClick={() => musicIconInputRef.current?.click()}
                >
                  <ImagePlus size={16} />
                  Upload Music Cover
                </Button>
                <Input
                  type="url"
                  placeholder="Or paste music cover URL here..."
                  value={data.musicIcon?.startsWith("data:") ? "" : data.musicIcon || ""}
                  onChange={(e) => setData((prev) => prev ? { ...prev, musicIcon: e.target.value } : prev)}
                  className="h-8 text-[13px] bg-secondary border-border"
                />
              </>
            )}
          </div>

          {/* Video */}
          <SectionTitle>Video</SectionTitle>
          <div className="py-1.5 space-y-2">
            {/* Video preview if uploaded */}
            {data.videoUrl && (
              <div className="relative w-full rounded-md overflow-hidden border border-border bg-black">
                <video src={data.videoUrl} className="w-full aspect-[9/16] object-cover" muted playsInline preload="metadata" />
                <button
                  onClick={() => setData((prev) => prev ? { ...prev, videoUrl: "" } : prev)}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-1"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            )}
            {/* Upload from gallery */}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 50 * 1024 * 1024) {
                  alert("Video must be under 50MB");
                  return;
                }
                setVideoUploading(true);
                setUploadProgress(0);
                try {
                  const ext = file.name.split('.').pop() || 'mp4';
                  const fileName = `reel-${reelIndex}-${Date.now()}.${ext}`;
                  let finalUrl = "";

                  // Method 1: Try Supabase SDK upload (most reliable)
                  try {
                    console.log("[VideoUpload] Attempting Supabase SDK upload...", fileName);
                    setUploadProgress(10);
                    const { data: uploadData, error: uploadError } = await supabase.storage
                      .from('reel-videos')
                      .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: true,
                        contentType: file.type,
                      });

                    if (uploadError) {
                      console.error("[VideoUpload] Supabase SDK error:", uploadError.message, uploadError);
                      throw uploadError;
                    }

                    setUploadProgress(80);
                    const { data: urlData } = supabase.storage.from('reel-videos').getPublicUrl(fileName);
                    finalUrl = urlData.publicUrl;
                    console.log("[VideoUpload] Supabase upload success:", finalUrl);
                    setUploadProgress(100);
                  } catch (sdkErr: any) {
                    console.warn("[VideoUpload] Supabase upload failed, trying XHR...", sdkErr?.message);

                    // Method 2: Try XHR upload
                    try {
                      finalUrl = await new Promise<string>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
                        const url = `${supabaseUrl}/storage/v1/object/reel-videos/${fileName}`;
                        xhr.upload.onprogress = (ev) => {
                          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
                        };
                        xhr.onload = () => {
                          if (xhr.status >= 200 && xhr.status < 300) {
                            const { data: urlData } = supabase.storage.from('reel-videos').getPublicUrl(fileName);
                            resolve(urlData.publicUrl);
                          } else {
                            console.error("[VideoUpload] XHR failed:", xhr.status, xhr.responseText);
                            reject(new Error(`Upload failed: ${xhr.status} - ${xhr.responseText}`));
                          }
                        };
                        xhr.onerror = () => reject(new Error("Network error"));
                        xhr.open("POST", url);
                        xhr.setRequestHeader("Authorization", `Bearer ${supabaseKey}`);
                        xhr.setRequestHeader("apikey", supabaseKey || "");
                        xhr.setRequestHeader("x-upsert", "true");
                        xhr.setRequestHeader("Content-Type", file.type);
                        xhr.setRequestHeader("Cache-Control", "max-age=3600");
                        xhr.send(file);
                      });
                      console.log("[VideoUpload] XHR upload success:", finalUrl);
                    } catch (xhrErr: any) {
                      console.warn("[VideoUpload] XHR also failed, using local blob URL fallback.", xhrErr?.message);
                      // Method 3: Fallback to local blob URL so form still works
                      finalUrl = URL.createObjectURL(file);
                      console.log("[VideoUpload] Using local blob URL:", finalUrl);
                    }
                  }

                  setData((prev) => prev ? { ...prev, videoUrl: finalUrl } : prev);
                } catch (err: any) {
                  console.error("[VideoUpload] All methods failed:", err);
                  // Final fallback: always use blob URL so the form works
                  const blobUrl = URL.createObjectURL(file);
                  setData((prev) => prev ? { ...prev, videoUrl: blobUrl } : prev);
                  console.log("[VideoUpload] Emergency fallback to blob URL:", blobUrl);
                } finally {
                  setVideoUploading(false);
                  setUploadProgress(0);
                  e.target.value = "";
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 text-[13px]"
              onClick={() => videoInputRef.current?.click()}
              disabled={videoUploading}
            >
              {videoUploading ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
              {videoUploading ? `Uploading... ${uploadProgress}%` : "Upload Video from Gallery"}
            </Button>
            {/* URL fallback */}
            <Input
              type="url"
              placeholder="Or paste video URL here..."
              value={data.videoUrl || ""}
              onChange={(e) => setData((prev) => prev ? { ...prev, videoUrl: e.target.value } : prev)}
              className="h-8 text-[13px] bg-secondary border-border"
            />
          </div>

          {/* Duration */}
          <SectionTitle>Duration</SectionTitle>
          <div className="py-1.5">
            <Input
              type="text"
              placeholder="0:10"
              value={data.duration || ""}
              onChange={(e) => setData((prev) => prev ? { ...prev, duration: e.target.value } : prev)}
              className="h-8 text-[13px] bg-secondary border-border"
            />
          </div>

          {/* Thumbnail */}
          <SectionTitle>Thumbnail</SectionTitle>
          <div className="py-1.5 space-y-2">
            {/* Preview */}
            {data.thumbnail && (
              <div className="relative w-20 h-28 rounded-md overflow-hidden border border-border">
                <img src={data.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                <button
                  onClick={() => setData((prev) => prev ? { ...prev, thumbnail: "" } : prev)}
                  className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
                >
                  <X size={12} className="text-white" />
                </button>
              </div>
            )}
            {/* Upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                  alert("Image must be under 2MB");
                  return;
                }
                const reader = new FileReader();
                reader.onload = (ev) => {
                  setData((prev) => prev ? { ...prev, thumbnail: ev.target?.result as string } : prev);
                };
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 text-[13px]"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={16} />
              Upload Thumbnail
            </Button>
            {/* URL fallback */}
            <Input
              type="url"
              placeholder="Or paste URL here..."
              value={data.thumbnail?.startsWith("data:") ? "" : data.thumbnail || ""}
              onChange={(e) => setData((prev) => prev ? { ...prev, thumbnail: e.target.value } : prev)}
              className="h-8 text-[13px] bg-secondary border-border"
            />
          </div>
          <SectionTitle>Engagement</SectionTitle>
          <Field label="Views" value={ins.views} onChange={(v) => setIns("views", Number(v))} />
          <Field label="Likes" value={ins.likes} onChange={(v) => setIns("likes", Number(v))} />
          <Field label="Comments" value={ins.comments} onChange={(v) => setIns("comments", Number(v))} />
          <Field label="Shares" value={ins.shares} onChange={(v) => setIns("shares", Number(v))} />
          <Field label="Reposts" value={ins.reposts || 0} onChange={(v) => setIns("reposts", Number(v))} />
          <Field label="Saves" value={ins.saves} onChange={(v) => setIns("saves", Number(v))} />

          {/* Watch Time */}
          <SectionTitle>Watch Time</SectionTitle>
          <Field label="Total Watch Time" value={ins.watchTime} onChange={(v) => setIns("watchTime", v)} type="text" />
          <Field label="Avg Watch Time" value={ins.avgWatchTime} onChange={(v) => setIns("avgWatchTime", v)} type="text" />

          {/* Views Split */}
          <SectionTitle>Views Split</SectionTitle>
          <Field label="Followers %" value={ins.followerViewsPct} onChange={(v) => setIns("followerViewsPct", Number(v))} />
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[13px] text-muted-foreground">Non-followers %</span>
            <span className="text-[13px] text-muted-foreground w-[120px] text-right">{100 - ins.followerViewsPct}%</span>
          </div>

          {/* View Rate */}
          <SectionTitle>View Rate Past 3 Sec</SectionTitle>
          <Field label="Rate %" value={ins.viewRatePast3Sec} onChange={(v) => setIns("viewRatePast3Sec", Number(v))} />

          {/* Sources */}
          <SectionTitle>Sources</SectionTitle>
          {ins.sources.map((src, idx) => (
            <Field
              key={src.name}
              label={src.name}
              value={src.pct}
              onChange={(v) => {
                setData((prev) => {
                  if (!prev) return prev;
                  const newSources = [...prev.insights.sources];
                  newSources[idx] = { ...newSources[idx], pct: Number(v) };
                  return { ...prev, insights: { ...prev.insights, sources: newSources } };
                });
              }}
            />
          ))}

          {/* Accounts Reached */}
          <SectionTitle>Accounts Reached</SectionTitle>
          <Field label="Reached" value={ins.accountsReached} onChange={(v) => setIns("accountsReached", Number(v))} />

          {/* Gender */}
          <SectionTitle>Gender</SectionTitle>
          <Field label="Male %" value={ins.genderMale} onChange={(v) => {
            const male = Math.min(100, Math.max(0, Number(v)));
            setData((prev) => prev ? { ...prev, insights: { ...prev.insights, genderMale: male, genderFemale: 100 - male } } : prev);
          }} />
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[13px] text-muted-foreground">Female %</span>
            <span className="text-[13px] text-muted-foreground w-[120px] text-right">{ins.genderFemale}%</span>
          </div>

          {/* Countries */}
          <SectionTitle>Countries</SectionTitle>
          {ins.countries.map((c, idx) => (
            <div key={idx} className="flex items-center gap-2 py-1">
              <Input
                value={c.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setData((prev) => {
                    if (!prev) return prev;
                    const newC = [...prev.insights.countries];
                    newC[idx] = { ...newC[idx], name: val };
                    return { ...prev, insights: { ...prev.insights, countries: newC } };
                  });
                }}
                className="flex-1 h-8 text-[13px] bg-secondary border-border"
                placeholder="Country"
              />
              <Input
                type="number"
                value={c.pct}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setData((prev) => {
                    if (!prev) return prev;
                    const newC = [...prev.insights.countries];
                    newC[idx] = { ...newC[idx], pct: val };
                    return { ...prev, insights: { ...prev.insights, countries: newC } };
                  });
                }}
                className="w-[80px] h-8 text-[13px] bg-secondary border-border text-right"
              />
              <span className="text-[12px] text-muted-foreground">%</span>
            </div>
          ))}

          {/* Age Groups */}
          <SectionTitle>Age Groups</SectionTitle>
          {ins.ageGroups.map((a, idx) => (
            <Field
              key={a.range}
              label={a.range}
              value={a.pct}
              onChange={(v) => {
                setData((prev) => {
                  if (!prev) return prev;
                  const newA = [...prev.insights.ageGroups];
                  newA[idx] = { ...newA[idx], pct: Number(v) };
                  return { ...prev, insights: { ...prev.insights, ageGroups: newA } };
                });
              }}
            />
          ))}

          {/* Profile Activity */}
          <SectionTitle>Profile Activity</SectionTitle>
          <Field label="Follows" value={ins.follows} onChange={(v) => setIns("follows", Number(v))} />

          {/* Graph Start Date */}
          <SectionTitle>Graph Start Date</SectionTitle>
          <div className="py-1.5">
            <Input
              type="text"
              placeholder="23 Jan"
              value={data.graphStartDate || ins.viewsOverTime?.[0]?.day || "23 Jan"}
              onChange={(e) => setData((prev) => prev ? { ...prev, graphStartDate: e.target.value } : prev)}
              className="h-8 text-[13px] bg-secondary border-border"
            />
          </div>

          {/* Views Over Time (5 Points) */}
          <SectionTitle>Views Over Time (5 Points)</SectionTitle>
          {ins.viewsOverTime.map((point, idx) => (
            <div key={idx} className="flex items-center gap-2 py-1">
              <Input
                value={point.day}
                onChange={(e) => {
                  const val = e.target.value;
                  setData((prev) => {
                    if (!prev) return prev;
                    const newV = [...prev.insights.viewsOverTime];
                    newV[idx] = { ...newV[idx], day: val };
                    return { ...prev, insights: { ...prev.insights, viewsOverTime: newV } };
                  });
                }}
                className="w-[80px] h-8 text-[13px] bg-secondary border-border"
                placeholder="Label"
              />
              <Input
                type="number"
                value={point.thisReel}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setData((prev) => {
                    if (!prev) return prev;
                    const newV = [...prev.insights.viewsOverTime];
                    newV[idx] = { ...newV[idx], thisReel: val };
                    return { ...prev, insights: { ...prev.insights, viewsOverTime: newV } };
                  });
                }}
                className="flex-1 h-8 text-[13px] bg-secondary border-border text-right"
                placeholder="This Reel"
              />
              <Input
                type="number"
                value={point.typical}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setData((prev) => {
                    if (!prev) return prev;
                    const newV = [...prev.insights.viewsOverTime];
                    newV[idx] = { ...newV[idx], typical: val };
                    return { ...prev, insights: { ...prev.insights, viewsOverTime: newV } };
                  });
                }}
                className="w-[70px] h-8 text-[13px] bg-secondary border-border text-right"
                placeholder="Typical"
              />
            </div>
          ))}

          {/* Y-Axis Lines */}
          <SectionTitle>Y-Axis Lines</SectionTitle>
          <div className="flex items-center gap-2 py-1">
            <span className="text-[12px] text-muted-foreground w-[80px]">Center</span>
            <Input
              type="number"
              value={data.yCenter ?? 500}
              onChange={(e) => setData((prev) => prev ? { ...prev, yCenter: Number(e.target.value) } : prev)}
              className="flex-1 h-8 text-[13px] bg-secondary border-border text-right"
              placeholder="500"
            />
          </div>
          <div className="flex items-center gap-2 py-1">
            <span className="text-[12px] text-muted-foreground w-[80px]">Top</span>
            <Input
              type="number"
              value={data.yTop ?? 1000}
              onChange={(e) => setData((prev) => prev ? { ...prev, yTop: Number(e.target.value) } : prev)}
              className="flex-1 h-8 text-[13px] bg-secondary border-border text-right"
              placeholder="1000"
            />
          </div>

          {/* Graph Drawing Editor */}
          <SectionTitle>Draw Graph</SectionTitle>
          <GraphEditorModal
            open={true}
            onClose={() => { }}
            onSave={(graphData) => {
              setData((prev) => prev ? { ...prev, insights: { ...prev.insights, viewsOverTime: graphData } } : prev);
            }}
            initialData={ins.viewsOverTime}
            maxViews={ins.views}
            inline={true}
          />
          <Button onClick={handleSave} className="w-full mt-6 bg-[#0095f6] hover:bg-[#0081d6] text-white font-semibold">
            Save Changes
          </Button>

          {onDelete && (
            <Button
              variant="ghost"
              onClick={() => {
                onDelete(reelIndex);
                onClose();
              }}
              className="w-full mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 font-semibold"
            >
              Delete Reel
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ReelEditModal;
