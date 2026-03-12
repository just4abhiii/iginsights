import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, Info, ChevronDown, Check, Film } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface FollowersData {
  totalFollowers: number;
  growth: string;
  compareDate: string;
  startDate: string;
  endDate: string;
  follows: number;
  unfollows: number;
  overall: number;
}

const defaultData: FollowersData = {
  totalFollowers: 39050,
  growth: "-0.6%",
  compareDate: "vs Jan 13",
  startDate: "14 Jan",
  endDate: "12 Feb",
  follows: 248,
  unfollows: 484,
  overall: -236,
};

const FollowersDetailScreen = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<FollowersData>(() => {
    const saved = localStorage.getItem("ig_followers_detail_data");
    return saved ? JSON.parse(saved) : defaultData;
  });
  const [isEditing, setIsEditing] = useState(false);

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
    localStorage.setItem("ig_followers_detail_data", JSON.stringify(data));
    setIsEditing(false);
  };

  const updateField = (field: keyof FollowersData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="pb-24 min-h-screen bg-background select-none overflow-x-hidden relative">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background border-b border-transparent">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/analytics')} className="text-foreground">
            <ArrowLeft size={28} strokeWidth={2.5} />
          </button>
          <h1 className="text-[20px] font-bold text-foreground">Followers</h1>
        </div>
        <div className="flex items-center gap-3">
          {isEditing && (
            <button onClick={saveChanges} className="bg-[#0095f6] text-white p-1.5 rounded-full shadow-lg flex items-center justify-center">
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
        <div className="flex items-center justify-between px-4 py-3 mt-1">
          <button className="flex items-center gap-1.5 bg-secondary/60 rounded-[10px] px-3 py-1.5 text-[14px] text-foreground font-semibold">
            Last 30 days <ChevronDown size={18} strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-1 font-bold text-[14px]">
            {isEditing ? (
               <>
                 <input className="w-12 bg-secondary/50 rounded text-center outline-none px-1" value={data.startDate} onChange={e => updateField('startDate', e.target.value)} />
                 <span className="text-foreground">-</span>
                 <input className="w-12 bg-secondary/50 rounded text-center outline-none px-1" value={data.endDate} onChange={e => updateField('endDate', e.target.value)} />
               </>
            ) : (
               <span className="text-foreground">{data.startDate} - {data.endDate}</span>
            )}
          </div>
        </div>

        <div className="border-b border-border/60 mx-4 mt-1" />

        {/* Follower count */}
        <div className="flex flex-col items-center py-10">
          {isEditing ? (
             <input 
               type="number"
               value={data.totalFollowers} 
               onChange={e => updateField('totalFollowers', parseInt(e.target.value) || 0)}
               className="text-[36px] font-bold text-foreground bg-secondary/50 rounded px-2 outline-none w-48 text-center"
             />
          ) : (
             <span className="text-[38px] font-bold text-foreground tracking-tight">{data.totalFollowers.toLocaleString()}</span>
          )}
          <span className="text-[16px] font-bold text-foreground mt-1">Followers</span>
          
          <div className="flex items-center gap-1 mt-1 font-medium">
             {isEditing ? (
               <input className="w-16 bg-secondary/30 rounded text-center text-[14px] font-bold outline-none" value={data.growth} onChange={e => updateField('growth', e.target.value)} />
             ) : (
               <span className="text-[14px] text-muted-foreground">{data.growth}</span>
             )}
             {isEditing ? (
               <input className="w-24 bg-secondary/30 rounded text-center text-[14px] font-bold outline-none" value={data.compareDate} onChange={e => updateField('compareDate', e.target.value)} />
             ) : (
               <span className="text-[14px] text-muted-foreground">{data.compareDate}</span>
             )}
          </div>
        </div>

        <div className="h-[6px] bg-secondary/30" />

        {/* Growth */}
        <div className="px-4 py-7">
          <h3 className="text-[18px] font-bold text-foreground mb-6">Growth</h3>
          <div className="space-y-6 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[16px] text-foreground font-medium">Overall</span>
              {isEditing ? (
                <input type="number" className="w-20 bg-secondary/30 rounded text-right font-bold outline-none px-1" value={data.overall} onChange={e => updateField('overall', parseInt(e.target.value) || 0)} />
              ) : (
                <span className="text-[16px] text-foreground font-bold">{data.overall}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[16px] text-foreground font-medium">Follows</span>
              {isEditing ? (
                <input type="number" className="w-20 bg-secondary/30 rounded text-right font-bold outline-none px-1" value={data.follows} onChange={e => updateField('follows', parseInt(e.target.value) || 0)} />
              ) : (
                <span className="text-[16px] text-foreground font-bold">{data.follows}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[16px] text-foreground font-medium">Unfollows</span>
              {isEditing ? (
                <input type="number" className="w-20 bg-secondary/30 rounded text-right font-bold outline-none px-1" value={data.unfollows} onChange={e => updateField('unfollows', parseInt(e.target.value) || 0)} />
              ) : (
                <span className="text-[16px] text-foreground font-bold">{data.unfollows}</span>
              )}
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
              className="bg-[#0095f6] text-white font-bold py-3.5 px-12 rounded-full shadow-2xl active:scale-[0.98] flex items-center gap-2"
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

export default FollowersDetailScreen;
