import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, Info, ChevronDown, Check, Film } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface InteractionsData {
  interactions: number;
  followerPct: number;
  nonFollowerPct: number;
  startDate: string;
  endDate: string;
  contentTypes: { name: string; followerPct: number; nonFollowerPct: number; total: number }[];
  interactionBreakdown: Record<string, { label: string; value: string }[]>;
  topReels: { image: string; likes: string; date: string }[];
}

const defaultData: InteractionsData = {
  interactions: 7026,
  followerPct: 23.0,
  nonFollowerPct: 77.0,
  startDate: "14 Jan",
  endDate: "12 Feb",
  contentTypes: [
    { name: "Reels", followerPct: 20, nonFollowerPct: 78.2, total: 98.2 },
    { name: "Stories", followerPct: 1.7, nonFollowerPct: 0, total: 1.7 },
    { name: "Posts", followerPct: 0.1, nonFollowerPct: 0, total: 0.1 },
  ],
  interactionBreakdown: {
    Reels: [
      { label: "Likes", value: "4,866" },
      { label: "Comments", value: "100" },
      { label: "Saves", value: "305" },
      { label: "Shares", value: "719" },
      { label: "Reposts", value: "313" },
    ],
    Posts: [
      { label: "Likes", value: "42" },
      { label: "Comments", value: "3" },
      { label: "Saves", value: "1" },
      { label: "Shares", value: "0" },
    ],
  },
  topReels: [
    { image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=260&fit=crop", likes: "3.2K", date: "22 Jan" },
    { image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=260&fit=crop", likes: "114", date: "20 Jan" },
    { image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=260&fit=crop", likes: "106", date: "17 Jan" },
    { image: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200&h=260&fit=crop", likes: "97", date: "18 Jan" },
  ],
};

const InteractionsDetailScreen = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<InteractionsData>(() => {
    const saved = localStorage.getItem("ig_interactions_detail_data");
    return saved ? JSON.parse(saved) : defaultData;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [interactionTab, setInteractionTab] = useState("Reels");

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
    localStorage.setItem("ig_interactions_detail_data", JSON.stringify(data));
    setIsEditing(false);
  };

  const updateField = (field: keyof InteractionsData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="pb-24 min-h-screen bg-background select-none overflow-x-hidden relative">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/analytics')} className="text-foreground">
            <ArrowLeft size={28} strokeWidth={2.5} />
          </button>
          <h1 className="text-[20px] font-bold text-foreground">Interactions</h1>
        </div>
        <div className="flex items-center gap-3">
          {isEditing && (
             <button onClick={saveChanges} className="bg-[#0095f6] text-white p-1.5 rounded-full shadow-lg">
               <Check size={20} strokeWidth={3} />
             </button>
          )}
          <button className="text-foreground">
            <div className="border-[2px] border-foreground rounded-full p-0.5 flex items-center justify-center w-6 h-6">
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
        <div className="flex items-center justify-between px-4 py-3">
          <button className="flex items-center gap-1.5 bg-secondary/60 rounded-[10px] px-3 py-1.5 text-[14px] text-foreground font-semibold">
            Last 30 days <ChevronDown size={18} strokeWidth={2.5} />
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

        <div className="border-b border-border/60 mx-4" />

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
              <span className="text-[13px] text-muted-foreground font-medium mb-1">Interactions</span>
              {isEditing ? (
                 <input 
                   type="number"
                   value={data.interactions} 
                   onChange={e => updateField('interactions', parseInt(e.target.value) || 0)}
                   className="text-[28px] font-bold text-foreground bg-secondary/50 rounded px-1 outline-none w-28 text-center"
                 />
              ) : (
                 <span className="text-[34px] font-bold text-foreground tracking-tight">{data.interactions.toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
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

        {/* Breakdown */}
        <div className="px-4 py-7">
          <h3 className="text-[17px] font-bold text-foreground mb-4">By interaction</h3>
          <div className="flex gap-2.5 mb-6">
            {["Reels", "Posts"].map((tab) => (
              <button key={tab} onClick={() => setInteractionTab(tab)}
                className={cn("rounded-full px-5 py-1.5 text-[13px] font-bold border",
                  interactionTab === tab ? "bg-secondary/40 text-foreground border-transparent" : "bg-transparent text-foreground border-border/80"
                )}>
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {(data.interactionBreakdown[interactionTab] || []).map((item, idx) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-[15px] text-foreground font-medium">{item.label}</span>
                {isEditing ? (
                   <input 
                     value={item.value} 
                     onChange={e => {
                        const newB = {...data.interactionBreakdown};
                        newB[interactionTab][idx].value = e.target.value;
                        updateField('interactionBreakdown', newB);
                     }}
                     className="w-24 bg-secondary/30 rounded text-right font-bold px-1 outline-none"
                   />
                ) : (
                   <span className="text-[15px] text-foreground font-bold">{item.value}</span>
                )}
              </div>
            ))}
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

export default InteractionsDetailScreen;
