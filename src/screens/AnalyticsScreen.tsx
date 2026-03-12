import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, ChevronRight, Settings, Check } from "lucide-react";
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
}

const defaultData: DashboardData = {
  views: "11,565",
  interactions: "7,026",
  newFollowers: "228",
  contentShared: "78",
  dateRange: "Last 30 days",
  nextStepTitle: "Keep it up!",
  nextStepSubtitle: "Your account reached +348% more accounts in the last 30 days.",
  nextStepImage: "https://images.unsplash.com/photo-1611162147731-0cf47351586b?w=200&h=200&fit=crop",
};

const AnalyticsScreen = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>(() => {
    const saved = localStorage.getItem("ig_dashboard_data");
    return saved ? JSON.parse(saved) : defaultData;
  });

  const [isEditing, setIsEditing] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isEditing) return; // Don't trigger long press if already editing
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

  const tools = [
    { label: "Ad tools", icon: <Settings size={22} />, subtitle: "" },
    { label: "Branded content", icon: <Settings size={22} />, subtitle: "" },
    { label: "Partnerships", icon: <Settings size={22} />, subtitle: "Check eligibility for monetization", badge: "New" },
  ];

  return (
    <div className="pb-24 min-h-screen bg-background select-none overflow-x-hidden relative">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background border-b border-transparent">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/profile')} className="text-foreground">
            <ArrowLeft size={28} strokeWidth={2.5} />
          </button>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">Professional Dashboard</h1>
        </div>
        {isEditing && (
          <button onClick={saveChanges} className="bg-[#0095f6] text-white p-1.5 rounded-full shadow-lg active:scale-90 transition-transform">
            <Check size={20} strokeWidth={3} />
          </button>
        )}
      </header>

      {/* Main Container */}
      <div 
        className="pt-2"
        onTouchStart={startPress}
        onTouchEnd={endPress}
        onMouseDown={startPress}
        onMouseUp={endPress}
        onMouseLeave={endPress}
      >
        {/* Insights Section */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mt-2 mb-4">
            <h2 className="text-[17px] font-bold text-foreground">Insights</h2>
            <button className="text-[14px] text-[#0095f6] font-bold">See all</button>
          </div>

          <div 
            onClick={() => !isEditing && navigate('/analytics/views')}
            className="bg-card border border-border/40 rounded-[12px] p-4 flex items-center justify-between active:bg-secondary/40 transition-colors shadow-sm mb-6 relative overflow-hidden"
          >
            <div className="flex-1">
               {isEditing ? (
                 <input 
                   autoFocus
                   value={data.dateRange} 
                   onChange={(e) => updateField('dateRange', e.target.value)}
                   className="text-[14px] text-muted-foreground bg-secondary/50 rounded px-1 outline-none w-full mb-1"
                 />
               ) : (
                 <p className="text-[14px] text-muted-foreground mb-0.5 font-medium">{data.dateRange}</p>
               )}
               
               {isEditing ? (
                 <input 
                   value={data.views} 
                   onChange={(e) => updateField('views', e.target.value)}
                   className="text-[16px] font-bold text-foreground bg-secondary/50 rounded px-1 outline-none w-full"
                 />
               ) : (
                 <p className="text-[16px] font-bold text-foreground">{data.views} Accounts reached</p>
               )}
            </div>
            {!isEditing && <ChevronRight size={20} className="text-muted-foreground/60" />}
          </div>

          <div className="space-y-0">
            {insightRows.map((row) => (
              <div
                key={row.label}
                onClick={() => !isEditing && navigate(row.route)}
                className="flex items-center justify-between w-full py-3.5 border-b border-border/10 last:border-0"
              >
                <span className="text-[15px] text-foreground font-medium">{row.label}</span>
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <input 
                      value={data[row.key]} 
                      onChange={(e) => updateField(row.key, e.target.value)}
                      className="text-[16px] font-semibold text-foreground bg-secondary/50 rounded px-1 outline-none w-24 text-right"
                    />
                  ) : (
                    <span className="text-[16px] text-foreground font-semibold">{row.value}</span>
                  )}
                  {!isEditing && <ChevronRight size={20} className="text-muted-foreground/50" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-[0.5px] bg-border/40 mx-4" />

        {/* Next step Card */}
        <div className="px-4 py-6">
          <h2 className="text-[17px] font-bold text-foreground mb-4">Next step</h2>
          <div className="border border-border/80 rounded-[12px] p-4 flex items-center gap-4 shadow-sm relative overflow-hidden">
            <div className="w-[64px] h-[64px] rounded-[10px] overflow-hidden flex-shrink-0 border border-border/20 relative group">
              <img src={data.nextStepImage} className="w-full h-full object-cover" />
              {isEditing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Plus size={16} className="text-white" />
                  <input 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => updateField('nextStepImage', e.target.value)}
                    placeholder="URL"
                  />
                </div>
              )}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <input 
                  value={data.nextStepTitle} 
                  onChange={(e) => updateField('nextStepTitle', e.target.value)}
                  className="text-[14px] font-bold text-foreground bg-secondary/50 rounded px-1 outline-none w-full mb-1"
                />
              ) : (
                <h3 className="text-[14px] font-bold text-foreground leading-tight">{data.nextStepTitle}</h3>
              )}

              {isEditing ? (
                <textarea 
                  value={data.nextStepSubtitle} 
                  onChange={(e) => updateField('nextStepSubtitle', e.target.value)}
                  className="text-[13px] text-muted-foreground bg-secondary/50 rounded px-1 outline-none w-full h-12 resize-none leading-tight"
                />
              ) : (
                <p className="text-[13px] text-muted-foreground mt-1 leading-[1.3] line-clamp-2">{data.nextStepSubtitle}</p>
              )}
            </div>
            {!isEditing && <ChevronRight size={18} className="text-muted-foreground/60" />}
          </div>
        </div>

        <div className="h-[6px] bg-secondary/30" />

        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[17px] font-bold text-foreground">Your tools</h2>
            <button className="text-[14px] text-[#0095f6] font-semibold">See all</button>
          </div>
          <div className="space-y-0 text-foreground">
            {tools.map((tool) => (
              <div key={tool.label} className="flex items-center gap-4 w-full py-4 border-b border-border/20 last:border-0 text-foreground">
                <div className="w-[28px] flex items-center justify-center">{tool.icon}</div>
                <div className="flex-1 text-left">
                  <span className="text-[15px] font-medium">{tool.label}</span>
                  {tool.subtitle && (
                    <p className="text-[13px] text-muted-foreground mt-0.5 leading-tight">{tool.subtitle}</p>
                  )}
                </div>
                {!isEditing && <ChevronRight size={18} className="text-muted-foreground/50" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save Toggle Overlay (Bottom Center) */}
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

      {/* Global click handlers to save on any press outside if needed, 
          but usually a specific button is safer. The user asked "phir press kren to save" */}
      {isEditing && (
        <div 
          className="fixed inset-0 z-10 pointer-events-none" 
          onClick={(e) => {
            // If they click on empty space, save
            if (e.target === e.currentTarget) saveChanges();
          }}
        />
      )}
    </div>
  );
};

export default AnalyticsScreen;
