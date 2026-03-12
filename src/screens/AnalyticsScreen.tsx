import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, ChevronRight, Settings, Check, Megaphone, Handshake, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DashboardData {
  views: string;
  interactions: string;
  newFollowers: string;
  contentShared: string;
  dateRange: string;
  nextStepTitle: string;
  nextStepSubtitle: string;
  nextStepImage: string;
  accountsReachedChange: string;
}

const defaultData: DashboardData = {
  views: "11,565",
  interactions: "7,026",
  newFollowers: "228",
  contentShared: "78",
  dateRange: "Last 30 days",
  nextStepTitle: "In-progress content",
  nextStepSubtitle: "Keep creating! You're reaching more accounts.",
  nextStepImage: "https://images.unsplash.com/photo-1611162147731-0cf47351586b?w=200&h=200&fit=crop",
  accountsReachedChange: "+348%",
};

const AnalyticsScreen = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>(() => {
    const saved = localStorage.getItem("ig_dashboard_data");
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
    localStorage.setItem("ig_dashboard_data", JSON.stringify(data));
    setIsEditing(false);
  };

  const updateField = (field: keyof DashboardData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const insightRows = [
    { label: "Accounts reached", value: data.views, key: "views" as keyof DashboardData, route: "/analytics/views" },
    { label: "Accounts engaged", value: data.interactions, key: "interactions" as keyof DashboardData, route: "/analytics/interactions" },
    { label: "Total followers", value: data.newFollowers, key: "newFollowers" as keyof DashboardData, route: "/analytics/followers" },
  ];

  return (
    <div className="pb-24 min-h-screen bg-background select-none overflow-x-hidden relative">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background border-b border-transparent">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/profile')} className="text-foreground">
            <ArrowLeft size={28} strokeWidth={2.5} />
          </button>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">Professional Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          {isEditing && (
            <button onClick={saveChanges} className="bg-[#0095f6] text-white p-1.5 rounded-full shadow-lg">
              <Check size={20} strokeWidth={3} />
            </button>
          )}
        </div>
      </header>

      <div 
        className="pt-2"
        onTouchStart={startPress}
        onTouchEnd={endPress}
        onMouseDown={startPress}
        onMouseUp={endPress}
        onMouseLeave={endPress}
      >
        {/* Insights Card */}
        <div className="mx-4 mt-2 p-4 bg-secondary/30 rounded-[12px] border border-border/40">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-[17px] font-bold">Insights</h3>
             <button className="text-[14px] text-[#0095f6] font-bold" onClick={() => navigate('/analytics/views')}>See all</button>
           </div>
           
           <div className="flex items-baseline gap-1 mb-1">
             {isEditing ? (
               <input className="bg-secondary/50 rounded px-1 w-20 outline-none" value={data.views} onChange={e => updateField('views', e.target.value)} />
             ) : (
               <span className="text-[18px] font-bold">{data.views}</span>
             )}
             <span className="text-[13px] text-muted-foreground font-medium">accounts reached in the last 30 days</span>
           </div>
           
           <div className="flex items-center gap-1.5 mb-6">
             <span className="text-[13px] text-green-500 font-bold">
               {isEditing ? (
                 <input className="bg-secondary/50 rounded px-1 w-16 outline-none" value={data.accountsReachedChange} onChange={e => updateField('accountsReachedChange', e.target.value)} />
               ) : data.accountsReachedChange}
             </span>
             <span className="text-[12px] text-muted-foreground font-medium">compared to Jan 13 - Feb 11</span>
           </div>

           <div className="space-y-4">
             {insightRows.map(row => (
               <div key={row.key} onClick={() => !isEditing && navigate(row.route)} className="flex items-center justify-between cursor-pointer">
                 <span className="text-[15px] font-medium text-foreground">{row.label}</span>
                 <div className="flex items-center gap-2">
                   {isEditing ? (
                     <input className="bg-secondary/50 rounded px-1 w-20 text-right outline-none" value={data[row.key]} onChange={e => updateField(row.key, e.target.value)} />
                   ) : (
                     <span className="text-[15px] font-bold">{row.value}</span>
                   )}
                   <ChevronRight size={18} className="text-muted-foreground/60" />
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* Next Step Card */}
        <div className="mx-4 mt-6 p-4 bg-secondary/30 rounded-[12px] border border-border/40 flex gap-4">
           <div className="flex-1">
             <h3 className="text-[16px] font-bold mb-1">
               {isEditing ? (
                 <input className="bg-secondary/50 rounded px-1 w-full outline-none" value={data.nextStepTitle} onChange={e => updateField('nextStepTitle', e.target.value)} />
               ) : data.nextStepTitle}
             </h3>
             <p className="text-[14px] text-muted-foreground leading-snug">
               {isEditing ? (
                 <textarea className="bg-secondary/50 rounded px-1 w-full outline-none text-[13px]" rows={2} value={data.nextStepSubtitle} onChange={e => updateField('nextStepSubtitle', e.target.value)} />
               ) : data.nextStepSubtitle}
             </p>
           </div>
           <div className="w-[60px] h-[60px] rounded-[10px] bg-secondary overflow-hidden flex-shrink-0">
             <img src={data.nextStepImage} alt="" className="w-full h-full object-cover" />
           </div>
        </div>

        {/* Tools Section */}
        <div className="mt-8 px-4">
           <h3 className="text-[17px] font-bold mb-4 px-1">Your tools</h3>
           <div className="space-y-6">
              <div className="flex items-center gap-4">
                 <div className="w-11 h-11 rounded-full bg-secondary/40 flex items-center justify-center text-foreground">
                    <Megaphone size={22} strokeWidth={1.5} />
                 </div>
                 <div className="flex-1 border-b border-border/40 pb-4">
                    <p className="font-bold text-[15px]">Ad tools</p>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="w-11 h-11 rounded-full bg-secondary/40 flex items-center justify-center text-foreground">
                    <Handshake size={22} strokeWidth={1.5} />
                 </div>
                 <div className="flex-1 border-b border-border/40 pb-4">
                    <p className="font-bold text-[15px]">Branded content</p>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="w-11 h-11 rounded-full bg-secondary/40 flex items-center justify-center text-foreground">
                    <Users size={22} strokeWidth={1.5} />
                 </div>
                 <div className="flex-1">
                    <div className="flex items-center justify-between font-bold text-[15px]">
                       <span>Partnerships</span>
                       <span className="bg-[#0095f6] text-white text-[10px] px-1.5 py-0.5 rounded-sm">New</span>
                    </div>
                    <p className="text-[13px] text-muted-foreground">Check your eligibility for monetization</p>
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

export default AnalyticsScreen;
