import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, Info, ChevronDown, Check, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ViewsData {
  views: number;
  followerPct: number;
  nonFollowerPct: number;
  accountsReached: number;
  accountsReachedChange: string;
  dateRange: string;
  startDate: string;
  endDate: string;
  contentTypes: { name: string; followerPct: number; nonFollowerPct: number; total: number }[];
  topContent: { image: string; views: string; date: string }[];
  countries: { name: string; pct: number }[];
  cities: { name: string; pct: number }[];
  ageRanges: { range: string; pct: number }[];
  profileActivityTotal: number;
  profileActivityChange: string;
  profileVisits: number;
  profileVisitsChange: string;
  linkTaps: number;
}

const defaultData: ViewsData = {
  views: 11565,
  followerPct: 51.6,
  nonFollowerPct: 48.4,
  accountsReached: 3117,
  accountsReachedChange: "-84.3%",
  dateRange: "Last 30 days",
  startDate: "10 Feb",
  endDate: "11 Mar",
  contentTypes: [
    { name: "Reels", followerPct: 50, nonFollowerPct: 43.3, total: 93.3 },
    { name: "Stories", followerPct: 6.6, nonFollowerPct: 0, total: 6.6 },
    { name: "Posts", followerPct: 0.1, nonFollowerPct: 0, total: 0.1 },
  ],
  topContent: [
    { image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=260&fit=crop", views: "38K", date: "1 Mar" },
    { image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=260&fit=crop", views: "6.8K", date: "17 Feb" },
    { image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=260&fit=crop", views: "2.1K", date: "21 Feb" },
    { image: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200&h=260&fit=crop", views: "1.8K", date: "14 Feb" },
  ],
  countries: [
    { name: "India", pct: 86.8 },
    { name: "Iran", pct: 2.1 },
    { name: "Pakistan", pct: 1.7 },
    { name: "Uzbekistan", pct: 0.8 },
  ],
  cities: [
    { name: "Delhi", pct: 2.7 },
    { name: "Mumbai", pct: 1.7 },
    { name: "Bangalore", pct: 1.5 },
    { name: "Kolkata", pct: 1.4 },
  ],
  ageRanges: [
    { range: "18-24", pct: 35.8 },
    { range: "13-17", pct: 29.0 },
    { range: "25-34", pct: 22.1 },
    { range: "35-44", pct: 7.9 },
  ],
  profileActivityTotal: 218,
  profileActivityChange: "-47.8%",
  profileVisits: 218,
  profileVisitsChange: "-47.8%",
  linkTaps: 0,
};

const ViewsDetailScreen = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ViewsData>(() => {
    const saved = localStorage.getItem("ig_views_detail_data");
    return saved ? JSON.parse(saved) : defaultData;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [contentTab, setContentTab] = useState("All");

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPress = useCallback(() => {
    if (isEditing) return;
    longPressTimer.current = setTimeout(() => {
      setIsEditing(true);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 2000);
  }, [isEditing]);

  const endPress = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const saveChanges = () => {
    localStorage.setItem("ig_views_detail_data", JSON.stringify(data));
    setIsEditing(false);
  };

  const updateField = (field: keyof ViewsData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="pb-24 min-h-screen bg-background select-none overflow-x-hidden relative">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background border-b border-transparent">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/analytics')} className="text-foreground">
            <ArrowLeft size={28} strokeWidth={2.5} />
          </button>
          <h1 className="text-[20px] font-bold text-foreground">Views</h1>
        </div>
        <div className="flex items-center gap-3">
          {isEditing && (
            <button onClick={saveChanges} className="bg-[#0095f6] text-white p-1.5 rounded-full shadow-lg">
              <Check size={20} strokeWidth={3} />
            </button>
          )}
          <button className="text-foreground">
            <div className="border-[2.5px] border-foreground rounded-full p-0.5 flex items-center justify-center w-6 h-6">
              <span className="text-[14px] font-bold">i</span>
            </div>
          </button>
        </div>
      </header>

      <div
        onTouchStart={startPress}
        onTouchEnd={endPress}
        onMouseDown={startPress}
        onMouseUp={endPress}
        onMouseLeave={endPress}
      >
        {/* Date line */}
        <div className="flex items-center justify-between px-4 py-3 mt-1">
          <button className="flex items-center gap-1.5 bg-secondary/60 rounded-[10px] px-3 py-1.5 text-[14px] text-foreground font-semibold">
            {data.dateRange} <ChevronDown size={18} strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-1">
            {isEditing ? (
               <>
                 <input className="w-12 bg-secondary/50 rounded text-center text-[14px] font-bold outline-none" value={data.startDate} onChange={e => updateField('startDate', e.target.value)} />
                 <span className="text-foreground">-</span>
                 <input className="w-12 bg-secondary/50 rounded text-center text-[14px] font-bold outline-none" value={data.endDate} onChange={e => updateField('endDate', e.target.value)} />
               </>
            ) : (
               <span className="text-[14px] font-bold text-foreground">{data.startDate} - {data.endDate}</span>
            )}
          </div>
        </div>

        <div className="border-b border-border/60 mx-4 mt-1" />

        {/* Donut Area */}
        <div className="flex justify-center py-10">
          <div className="relative w-[210px] h-[210px]">
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
              <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--secondary)/0.5)" strokeWidth="8" />
              <circle cx="100" cy="100" r="80" fill="none" stroke="#D32FE0" strokeWidth="11"
                strokeDasharray={`${(data.followerPct / 100) * 2 * Math.PI * 80} ${2 * Math.PI * 80}`}
                strokeLinecap="round" />
              <circle cx="100" cy="100" r="80" fill="none" stroke="#5B21B6" strokeWidth="11"
                strokeDasharray={`${(data.nonFollowerPct / 100) * 2 * Math.PI * 80} ${2 * Math.PI * 80}`}
                strokeDashoffset={`${-(data.followerPct / 100) * 2 * Math.PI * 80 - (2 * Math.PI * 80 * 0.005)}`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[13px] text-muted-foreground font-medium mb-1">Views</span>
              {isEditing ? (
                <input 
                  type="number"
                  value={data.views} 
                  onChange={e => updateField('views', parseInt(e.target.value) || 0)}
                  className="text-[28px] font-bold text-foreground bg-secondary/50 rounded px-1 outline-none w-28 text-center"
                />
              ) : (
                <span className="text-[34px] font-bold text-foreground tracking-tight">{data.views.toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Percentages */}
        <div className="px-6 space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-[9px] w-[9px] rounded-full bg-[#D32FE0]" />
              <span className="text-[14px] text-foreground font-medium">Followers</span>
            </div>
            {isEditing ? (
               <input className="w-16 bg-secondary/50 rounded text-right text-[14px] font-bold outline-none" value={data.followerPct} onChange={e => updateField('followerPct', parseFloat(e.target.value) || 0)} />
            ) : (
               <span className="text-[14px] text-foreground font-medium">{data.followerPct.toFixed(1)}%</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-[9px] w-[9px] rounded-full bg-[#5B21B6]" />
              <span className="text-[14px] text-foreground font-medium">Non-followers</span>
            </div>
            <span className="text-[14px] text-foreground font-medium">{data.nonFollowerPct.toFixed(1)}%</span>
          </div>
        </div>

        <div className="border-b border-border/60 mx-4" />

        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <span className="text-[15px] text-foreground font-medium">Accounts reached</span>
            <div className="text-right">
              {isEditing ? (
                 <input className="w-24 bg-secondary/50 rounded text-right text-[15px] font-bold outline-none" value={data.accountsReached} onChange={e => updateField('accountsReached', parseInt(e.target.value) || 0)} />
              ) : (
                 <span className="text-[15px] text-foreground font-bold">{data.accountsReached.toLocaleString()}</span>
              )}
              {isEditing ? (
                 <input className="w-16 bg-secondary/50 rounded text-right text-[12px] font-bold outline-none block ml-auto mt-1" value={data.accountsReachedChange} onChange={e => updateField('accountsReachedChange', e.target.value)} />
              ) : (
                 <p className={cn("text-[12px] font-bold mt-0.5", data.accountsReachedChange.startsWith('-') ? "text-muted-foreground/60" : "text-green-500")}>
                   {data.accountsReachedChange}
                 </p>
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-border/60 mx-4" />

        {/* Profile activity */}
        <div className="px-4 py-7">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-bold text-foreground">Profile activity</h3>
              <Info size={16} strokeWidth={2.5} className="text-foreground" />
            </div>
            {isEditing ? (
               <input className="w-16 bg-secondary/50 rounded text-right font-bold outline-none" value={data.profileActivityTotal} onChange={e => updateField('profileActivityTotal', parseInt(e.target.value) || 0)} />
            ) : (
               <span className="text-[17px] font-bold text-foreground">{data.profileActivityTotal}</span>
            )}
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-foreground font-medium">Profile visits</span>
              <div className="text-right">
                {isEditing ? (
                  <input className="w-16 bg-secondary/30 rounded text-right font-bold outline-none" value={data.profileVisits} onChange={e => updateField('profileVisits', parseInt(e.target.value) || 0)} />
                ) : (
                  <span className="text-[15px] text-foreground font-bold">{data.profileVisits}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-0 right-0 flex justify-center z-[60]"
          >
            <button 
              onClick={saveChanges}
              className="bg-[#0095f6] text-white font-bold py-3 px-10 rounded-full shadow-2xl active:scale-[0.98] flex items-center gap-2"
            >
              <Check size={20} strokeWidth={3} />
              SAVE CHANGES
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Film = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M19.82 2H4.18C2.97608 2 2 2.97608 2 4.18V19.82C2 21.0239 2.97608 22 4.18 22H19.82C21.0239 22 22 21.0239 22 19.82V4.18C22 2.97608 21.0239 2 19.82 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 2V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 2V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 7H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 17H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 7H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default ViewsDetailScreen;
