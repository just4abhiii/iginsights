import { Plus } from "lucide-react";
import type { Story } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface StoryCircleProps {
  story: Story;
  onClick?: () => void;
}

const StoryCircle = ({ story, onClick }: StoryCircleProps) => (
  <button
    className="flex flex-col items-center gap-1 min-w-[88px] active:scale-95 transition-transform duration-150"
    onClick={onClick}
  >
    <div className="relative">
      <div className={cn(
        "rounded-full",
        story.isOwn
          ? "border-[2.5px] border-muted-foreground/40 bg-background p-[2.5px]"
          : story.isLive
            ? "bg-gradient-to-br from-[hsl(280,70%,50%)] via-[hsl(350,80%,55%)] to-[hsl(37,97%,55%)] p-[3px]"
            : "story-ring p-[3px]"
      )}>
        <div className="rounded-full bg-background p-[2px]">
          <img
            src={story.avatar}
            alt={story.username}
            className="h-[76px] w-[76px] rounded-full object-cover"
          />
        </div>
      </div>
      {story.isOwn && (
        <div className="absolute bottom-[2px] right-[2px] flex h-[20px] w-[20px] items-center justify-center rounded-full border-[2px] border-background bg-[#0095F6] text-white">
          <Plus size={12} strokeWidth={3} />
        </div>
      )}
      {story.storyNote && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 animate-in fade-in zoom-in duration-300">
          <div className="relative bg-white dark:bg-[#262626] border border-black/5 dark:border-white/10 rounded-[18px] px-3.5 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.15)] min-w-[50px] max-w-[95px]">
            <p className="text-[11px] leading-tight text-foreground line-clamp-2 text-center font-normal">
              {story.storyNote}
            </p>
            {/* Thought bubble tails (circles) */}
            <div className="absolute -bottom-[3px] left-[45%] w-[8px] h-[8px] rounded-full bg-white dark:bg-[#262626] border-b border-black/5 dark:border-white/10" />
            <div className="absolute -bottom-[7px] left-[40%] w-[5px] h-[5px] rounded-full bg-white dark:bg-[#262626] border-b border-black/5 dark:border-white/10" />
          </div>
        </div>
      )}
      {story.isLive && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-[3px] bg-gradient-to-r from-[hsl(350,80%,55%)] to-[hsl(280,70%,50%)] px-[5px] py-[1px] text-[9px] font-bold text-white uppercase tracking-wide border-[1.5px] border-background">
          Live
        </div>
      )}
    </div>
    <span className={cn(
      "w-[88px] truncate text-center text-[12px]",
      story.isLive ? "text-[hsl(var(--ig-like))] font-medium" : "text-foreground"
    )}>
      {story.username}
    </span>
  </button>
);

export default StoryCircle;