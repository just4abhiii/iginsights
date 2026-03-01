import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, ChevronLeft, MoreVertical, Eye, Rocket, ArrowLeft } from "lucide-react";
import { mockAccounts, currentUser } from "@/data/mockData";
import { loadReelsData } from "@/data/reelInsightsData";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const RepostIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 12V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 12v3a4 4 0 0 1-4 4H3" />
  </svg>
);

const CameraIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

// Direct video player with autoplay fallback
const DirectVideoPlayer = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPlayBtn, setShowPlayBtn] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setShowPlayBtn(false);
    video.pause();
    video.src = src;
    video.load();

    const onCanPlay = async () => {
      console.log("[VideoPlayer] canplay fired, attempting play for:", src);
      try {
        video.muted = true;
        await video.play();
        console.log("[VideoPlayer] playing successfully");
        try { video.muted = false; } catch { }
      } catch (err) {
        console.warn("[VideoPlayer] autoplay failed:", err);
        setShowPlayBtn(true);
      }
    };

    const onError = () => {
      console.warn("Video load error for:", src);
      setFailed(true);
      setShowPlayBtn(true);
    };

    // Timeout fallback if video doesn't respond
    const timeout = setTimeout(() => {
      if (video.readyState < 3) {
        setShowPlayBtn(true);
      }
    }, 3000);

    video.addEventListener('canplay', onCanPlay, { once: true });
    video.addEventListener('error', onError, { once: true });
    return () => {
      clearTimeout(timeout);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onError);
    };
  }, [src]);

  const handleManualPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.play().then(() => setShowPlayBtn(false)).catch(() => {
      v.muted = true;
      v.play().then(() => setShowPlayBtn(false)).catch(() => { });
    });
  };

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        loop
        playsInline
        preload="auto"
        onClick={(e) => {
          const v = e.currentTarget;
          if (v.paused) {
            v.muted = false;
            v.play().catch(() => { v.muted = true; v.play().catch(() => { }); });
            setShowPlayBtn(false);
          } else if (v.muted) {
            v.muted = false;
          }
        }}
      />
      {showPlayBtn && (
        <button
          onClick={handleManualPlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 z-10"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
          </div>
        </button>
      )}
    </div>
  );
};

const ReelDetailScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const accountUsername = searchParams.get("account") || "just4abhii";
  const account = mockAccounts[accountUsername] || mockAccounts["just4abhii"] || Object.values(mockAccounts)[0];
  const postIndex = parseInt(id || "0");

  const [liked, setLiked] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(true);

  if (!account) {
    navigate('/profile');
    return null;
  }

  // Check if this account is the main user account (just4abhii or renamed version)
  const isMainAccount = accountUsername === "just4abhii" || account.profile === currentUser;
  const reelsData = isMainAccount ? loadReelsData() : null;
  const reelData = isMainAccount && reelsData ? reelsData[postIndex] : null;
  const fallbackPost = account.posts[postIndex] || account.posts[0];
  // Thumbnail: prioritize custom, then auto-generate from video URL
  const getPostImage = () => {
    const thumb = reelData?.thumbnail || fallbackPost?.thumbnail;
    if (thumb) return thumb;
    const videoUrl = reelData?.videoUrl || fallbackPost?.videoUrl;
    if (videoUrl?.includes("streamable.com")) {
      const idMatch = videoUrl.match(/streamable\.com\/(?:e\/|o\/)?([a-zA-Z0-9]+)/);
      const videoId = idMatch ? idMatch[1] : videoUrl.split("/").pop();
      return `https://cdn-cf-east.streamable.com/image/${videoId}.jpg`;
    }
    return thumb;
  };
  const postImage = getPostImage();

  // Dynamic stats from insights data
  const ins = reelData?.insights;
  const caption = reelData?.caption || "Nancy doll 😘🌹 ...";
  const fmtK = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
    return String(n);
  };
  const stats = {
    likes: ins?.likes || 725,
    comments: ins?.comments || 10,
    sends: ins?.shares || 24,
    saves: ins?.saves || 60,
    views: ins ? fmtK(ins.views) : "7K",
  };

  const handleViewInsights = () => {
    navigate(`/reel-insights/${postIndex}?account=${accountUsername}`);
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Full screen media — fills entire viewport, 9:16 Instagram size */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        <div className="relative w-full h-full max-w-[calc(100vh*9/16)] mx-auto">
          {(reelData?.videoUrl || fallbackPost?.videoUrl) && videoPlaying ? (
            (() => {
              const videoUrl = reelData?.videoUrl || fallbackPost?.videoUrl || "";
              if (videoUrl.includes("screenpal.com")) {
                const idMatch = videoUrl.match(/screenpal\.com\/(?:watch|player|content\/video)\/([a-zA-Z0-9]+)/);
                const videoId = idMatch ? idMatch[1] : videoUrl.split("/").pop();
                return <DirectVideoPlayer src={`https://go.screenpal.com/player/stream/${videoId}`} />;
              }
              if (videoUrl.includes("streamable.com")) {
                const idMatch = videoUrl.match(/streamable\.com\/(?:e\/|o\/)?([a-zA-Z0-9]+)/);
                const videoId = idMatch ? idMatch[1] : videoUrl.split("/").pop();
                return (
                  <div className="absolute inset-0 overflow-hidden bg-black flex items-center justify-center">
                    <iframe
                      src={`https://streamable.com/e/${videoId}?autoplay=1&loop=1&muted=0&controls=0&title=0&nocontrols=1`}
                      className="absolute border-0 z-10"
                      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                      allowFullScreen
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>
                );
              }
              return <DirectVideoPlayer src={videoUrl} />;
            })()
          ) : (
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => {
                if (reelData?.videoUrl || fallbackPost?.videoUrl) {
                  setVideoPlaying(true);
                }
              }}
            >
              <img src={postImage} alt="Reel" className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[60] flex items-center justify-between px-4 pt-10 pb-2">
        <button onClick={() => navigate('/profile')} className="text-white active:opacity-60 p-1">
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <button className="text-white active:opacity-60 p-1">
          <CameraIcon />
        </button>
      </div>

      {/* Right side actions */}
      <div className="absolute right-4 bottom-[120px] flex flex-col items-center gap-5 z-10">
        {/* Heart */}
        <button onClick={() => setLiked(!liked)} className="flex flex-col items-center gap-0.5">
          <Heart size={28} className={cn(liked ? "fill-[#FF3040] text-[#FF3040]" : "text-white")} />
          <span className="text-[11px] text-white font-semibold">{stats.likes}</span>
        </button>
        {/* Comment */}
        <button className="flex flex-col items-center gap-0.5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "scaleX(-1)" }}>
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span className="text-[11px] text-white font-semibold">{stats.comments}</span>
        </button>
        {/* Repost */}
        <button className="flex flex-col items-center gap-0.5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 12V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 12v3a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
        {/* Send */}
        <button className="flex flex-col items-center gap-0.5">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
          <span className="text-[11px] text-white font-semibold">{stats.sends}</span>
        </button>
        {/* Bookmark */}
        <button onClick={() => setSaved(!saved)} className="flex flex-col items-center gap-0.5">
          <Bookmark size={28} className={cn("text-white", saved && "fill-white")} />
          <span className="text-[11px] text-white font-semibold">{stats.saves}</span>
        </button>
        {/* 3 dots */}
        <button className="text-white">
          <MoreVertical size={22} />
        </button>
        {/* Music disc / profile pic — small spinning disc like IG */}
        <div className="w-[28px] h-[28px] rounded-[6px] border-[1.5px] border-white/40 overflow-hidden">
          {reelData?.musicTitle && reelData?.musicIcon ? (
            <img src={reelData.musicIcon} alt="" className="w-full h-full object-cover" />
          ) : (
            <img src={account.profile.avatar} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      </div>

      {/* Bottom content overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-3">
        {/* Avatar + Username + Music stacked tight like IG */}
        <div className="flex items-start gap-1.5 mb-1">
          <img src={account.profile.avatar} alt="" className="h-[28px] w-[28px] rounded-full object-cover border border-white/30 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-white leading-tight">{account.profile.username}</span>
            {reelData?.musicTitle && (
              <div className="flex items-center gap-1 mt-[2px]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                  <path d="M9 17V4l10-2v13" stroke="white" strokeWidth="2.5" fill="none" />
                  <ellipse cx="5.5" cy="17.5" rx="3.5" ry="2.5" fill="white" />
                  <ellipse cx="15.5" cy="15.5" rx="3.5" ry="2.5" fill="white" />
                </svg>
                <span className="text-[11px] text-white/70 truncate">{reelData.musicTitle}</span>
              </div>
            )}
          </div>
        </div>
        {/* Line 3: Caption */}
        <div className="mb-1.5 mt-1">
          {caption && caption.length > 50 && !showFullCaption ? (
            <p className="text-[13px] text-white/90 leading-[17px] break-words">
              {caption.slice(0, 50)}...{" "}
              <button onClick={() => setShowFullCaption(true)} className="text-white/50">more</button>
            </p>
          ) : (
            <p className="text-[13px] text-white/90 leading-[17px] break-words">{caption}</p>
          )}
        </div>

        {/* View Insights + Boost Reel */}
        <div className="border-t-[2px] border-white/25 mt-1" />
        <div className="flex items-center justify-between pt-4 pb-2 px-4">
          <button onClick={handleViewInsights} className="flex items-center gap-1.5">
            <svg width="13" height="11" viewBox="0 0 120 100">
              <defs>
                <mask id="eye-mask-detail">
                  <rect width="120" height="100" fill="white" />
                  <circle cx="74" cy="48" r="14" fill="black" />
                </mask>
              </defs>
              <path d="M15 45 C30 8, 90 8, 105 45" stroke="white" strokeWidth="10" strokeLinecap="round" fill="none" />
              <circle cx="60" cy="62" r="30" fill="white" mask="url(#eye-mask-detail)" />
            </svg>
            <span className="text-[12px] text-white/90 font-normal">{stats.views} · View Insights</span>
          </button>
          <button className="flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-85">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            <span className="text-[12px] text-white/90 font-normal">Boost Reel</span>
          </button>
        </div>

        {/* Add comment bar — overlaid at bottom */}
        <div className="bg-black -mx-3 px-3 pb-2.5 pt-3 mt-1.5">
          <div className="bg-[#262626] rounded-full px-4 py-2.5 flex items-center">
            <span className="text-[14px] text-white/40">Add comment...</span>
          </div>
        </div>
      </div>


    </motion.div>
  );
};

export default ReelDetailScreen;
