import os

file_path = "src/screens/ReelInsightsScreen.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    original_code = f.read()

code = original_code

def replace_exact(old, new, description):
    global code
    if old in code:
        # Check if old occurs exactly once to avoid multiple replacement bugs
        count = code.count(old)
        if count == 1:
            code = code.replace(old, new)
            print(f"SUCCESS: Replaced {description}")
        else:
            print(f"ERROR: Found {count} instances of {description}. Skipping to avoid duplication.")
            return False
    else:
        print(f"ERROR: Chunk not found for {description}.")
        return False
    return True

# 1. Views Donut
old_views = """            <div
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer select-none"
              onContextMenu={(e) => e.preventDefault()}
              onTouchStart={() => startLongPress("Views", views, setEditViews)}
              onTouchEnd={endLongPress}
              onTouchCancel={endLongPress}
              onMouseDown={() => startLongPress("Views", views, setEditViews)}
              onMouseUp={endLongPress}
              onMouseLeave={endLongPress}
            >"""
new_views = """            <div
              className={cn("absolute inset-0 flex flex-col items-center justify-center", isEditMode && "cursor-pointer active:bg-secondary/20 rounded-full transition-colors")}
              onClick={() => isEditMode && setEditModal({ label: "Views", value: String(views), onSave: setEditViews })}
            >"""
replace_exact(old_views, new_views, "Views donut chart area")

# 2. Followers %
old_fol = """          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onContextMenu={(e) => e.preventDefault()}
            onTouchStart={() => startLongPress("Followers %", followerPct, (v) => setEditFollowerPct(Math.min(100, v)))}
            onTouchEnd={endLongPress}
            onTouchCancel={endLongPress}
            onMouseDown={() => startLongPress("Followers %", followerPct, (v) => setEditFollowerPct(Math.min(100, v)))}
            onMouseUp={endLongPress}
            onMouseLeave={endLongPress}
          >"""
new_fol = """          <div
            className={cn("flex items-center justify-between", isEditMode && "cursor-pointer active:bg-secondary/20 rounded px-2 relative -left-2 w-[calc(100%+16px)] py-1 transition-colors")}
            onClick={() => isEditMode && setEditModal({ label: "Followers %", value: String(followerPct), onSave: (v) => setEditFollowerPct(Math.min(100, v)) })}
          >"""
replace_exact(old_fol, new_fol, "Followers percentage display")

# 3. Interactions Donut
old_int = """            <div
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer select-none"
              onContextMenu={(e) => e.preventDefault()}
              onTouchStart={() => startLongPress("Interactions", totalInteractions, (v) => setEditInteractions(v))}
              onTouchEnd={endLongPress}
              onTouchCancel={endLongPress}
              onMouseDown={() => startLongPress("Interactions", totalInteractions, (v) => setEditInteractions(v))}
              onMouseUp={endLongPress}
              onMouseLeave={endLongPress}
            >"""
new_int = """            <div
              className={cn("absolute inset-0 flex flex-col items-center justify-center", isEditMode && "cursor-pointer active:bg-secondary/20 rounded-full transition-colors")}
              onClick={() => isEditMode && setEditModal({ label: "Interactions", value: String(totalInteractions), onSave: setEditInteractions })}
            >"""
replace_exact(old_int, new_int, "Interactions donut chart area")

# 4. Skip rate
old_skip = """        <div
          className="flex items-center justify-between py-1 cursor-pointer select-none"
          onContextMenu={(e) => e.preventDefault()}
          onTouchStart={() => startLongPress("This reel's skip rate (%)", editSkipRate, (v) => setEditSkipRate(Math.min(100, v)))}
          onTouchEnd={endLongPress}
          onTouchCancel={endLongPress}
          onMouseDown={() => startLongPress("This reel's skip rate (%)", editSkipRate, (v) => setEditSkipRate(Math.min(100, v)))}
          onMouseUp={endLongPress}
          onMouseLeave={endLongPress}
        >"""
new_skip = """        <div
          className={cn("flex items-center justify-between py-1", isEditMode && "cursor-pointer active:bg-secondary/20 rounded px-2 relative -left-2 w-[calc(100%+16px)] transition-colors")}
          onClick={() => isEditMode && setEditModal({ label: "This reel's skip rate (%)", value: String(editSkipRate), onSave: (v) => setEditSkipRate(Math.min(100, v)) })}
        >"""
replace_exact(old_skip, new_skip, "Skip rate area")

# 5. Typical Skip rate
old_typ_skip = """        <div
          className="flex items-center justify-between py-1 cursor-pointer select-none"
          onContextMenu={(e) => e.preventDefault()}
          onTouchStart={() => startLongPress("Your typical skip rate (%)", editTypicalSkipRate, (v) => setEditTypicalSkipRate(Math.min(100, v)))}
          onTouchEnd={endLongPress}
          onTouchCancel={endLongPress}
          onMouseDown={() => startLongPress("Your typical skip rate (%)", editTypicalSkipRate, (v) => setEditTypicalSkipRate(Math.min(100, v)))}
          onMouseUp={endLongPress}
          onMouseLeave={endLongPress}
        >"""
new_typ_skip = """        <div
          className={cn("flex items-center justify-between py-1", isEditMode && "cursor-pointer active:bg-secondary/20 rounded px-2 relative -left-2 w-[calc(100%+16px)] transition-colors")}
          onClick={() => isEditMode && setEditModal({ label: "Your typical skip rate (%)", value: String(editTypicalSkipRate), onSave: (v) => setEditTypicalSkipRate(Math.min(100, v)) })}
        >"""
replace_exact(old_typ_skip, new_typ_skip, "Typical Skip rate area")

# 6. Watch time
old_watch = """        <div
          className="flex items-center justify-between py-1 cursor-pointer select-none"
          onContextMenu={(e) => e.preventDefault()}
          onTouchStart={() => {
            longPressTriggered.current = false;
            longPressTimer.current = setTimeout(() => {
              longPressTriggered.current = true;
              setEditModal({
                label: "Watch time (e.g. 4h 49m 17s)",
                value: editWatchTime,
                isText: true,
                onSave: ((v: any) => setEditWatchTime(String(v))) as any,
              });
            }, 800);
          }}
          onTouchEnd={endLongPress}
          onTouchCancel={endLongPress}
          onMouseDown={() => {
            longPressTriggered.current = false;
            longPressTimer.current = setTimeout(() => {
              longPressTriggered.current = true;
              setEditModal({
                label: "Watch time (e.g. 4h 49m 17s)",
                value: editWatchTime,
                isText: true,
                onSave: ((v: any) => setEditWatchTime(String(v))) as any,
              });
            }, 800);
          }}
          onMouseUp={endLongPress}
          onMouseLeave={endLongPress}
        >"""
new_watch = """        <div
          className={cn("flex items-center justify-between py-1", isEditMode && "cursor-pointer active:bg-secondary/20 rounded px-2 relative -left-2 w-[calc(100%+16px)] transition-colors")}
          onClick={() => isEditMode && setEditModal({ label: "Watch time (e.g. 4h 49m 17s)", value: editWatchTime, isText: true, onSave: ((v: any) => setEditWatchTime(String(v))) as any })}
        >"""
replace_exact(old_watch, new_watch, "Watch time element")

# 7. Avg Watch time
old_avg_watch = """        <div
          className="flex items-center justify-between py-1 cursor-pointer select-none"
          onContextMenu={(e) => e.preventDefault()}
          onTouchStart={() => {
            longPressTriggered.current = false;
            longPressTimer.current = setTimeout(() => {
              longPressTriggered.current = true;
              setEditModal({
                label: "Average watch time (e.g. 10 sec)",
                value: editAvgWatchTime,
                isText: true,
                onSave: ((v: any) => setEditAvgWatchTime(String(v))) as any,
              });
            }, 800);
          }}
          onTouchEnd={endLongPress}
          onTouchCancel={endLongPress}
          onMouseDown={() => {
            longPressTriggered.current = false;
            longPressTimer.current = setTimeout(() => {
              longPressTriggered.current = true;
              setEditModal({
                label: "Average watch time (e.g. 10 sec)",
                value: editAvgWatchTime,
                isText: true,
                onSave: ((v: any) => setEditAvgWatchTime(String(v))) as any,
              });
            }, 800);
          }}
          onMouseUp={endLongPress}
          onMouseLeave={endLongPress}
        >"""
new_avg_watch = """        <div
          className={cn("flex items-center justify-between py-1", isEditMode && "cursor-pointer active:bg-secondary/20 rounded px-2 relative -left-2 w-[calc(100%+16px)] transition-colors")}
          onClick={() => isEditMode && setEditModal({ label: "Average watch time (e.g. 10 sec)", value: editAvgWatchTime, isText: true, onSave: ((v: any) => setEditAvgWatchTime(String(v))) as any })}
        >"""
replace_exact(old_avg_watch, new_avg_watch, "Average watch time element")

# 8. Accounts Reached
old_accounts = """        <div
          className="border-t border-border mt-5 pt-4 flex items-center justify-between cursor-pointer select-none"
          onContextMenu={(e) => e.preventDefault()}
          onTouchStart={() => startLongPress("Accounts reached", accountsReached, setEditAccountsReached)}
          onTouchEnd={endLongPress}
          onTouchCancel={endLongPress}
          onMouseDown={() => startLongPress("Accounts reached", accountsReached, setEditAccountsReached)}
          onMouseUp={endLongPress}
          onMouseLeave={endLongPress}
        >"""
new_accounts = """        <div
          className={cn("border-t border-border mt-5 pt-4 flex items-center justify-between", isEditMode && "cursor-pointer active:bg-secondary/20 rounded px-2 relative -left-2 w-[calc(100%+16px)] transition-colors")}
          onClick={() => isEditMode && setEditModal({ label: "Accounts reached", value: String(accountsReached), onSave: setEditAccountsReached })}
        >"""
replace_exact(old_accounts, new_accounts, "Accounts Reached element")

# 9. Follows in Profile Activity
old_follows = """        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => isEditMode && setEditModal({ label: "Follows", value: String(follows), onSave: setEditFollows })}
        >"""
new_follows = """        <div 
          className={cn("flex items-center justify-between", isEditMode && "cursor-pointer active:bg-secondary/20 rounded px-2 relative -left-2 w-[calc(100%+16px)] py-1 transition-colors")}
          onClick={() => isEditMode && setEditModal({ label: "Follows", value: String(follows), onSave: setEditFollows })}
        >"""
replace_exact(old_follows, new_follows, "Follows list")

# 10. Profile activity header follows count
old_hdr_follows = """        <div
          className="flex items-center justify-between mb-3 cursor-pointer select-none"
          onClick={() => isEditMode && setEditModal({ label: "Follows", value: String(follows), onSave: setEditFollows })}
        >"""
new_hdr_follows = """        <div
          className={cn("flex items-center justify-between mb-3", isEditMode && "cursor-pointer active:bg-secondary/20 rounded px-2 relative -left-2 w-[calc(100%+16px)] py-1 transition-colors")}
          onClick={() => isEditMode && setEditModal({ label: "Follows", value: String(follows), onSave: setEditFollows })}
        >"""
replace_exact(old_hdr_follows, new_hdr_follows, "Profile Activity Header")

# 11. Likes, Shares, Comments, Saves breakdown
old_breakdown = """          {[
            { label: "Likes", value: fmtNum(likes) },
            { label: "Shares", value: fmtNum(shares) },
            { label: "Saves", value: fmtNum(saves) },
            { label: "Comments", value: fmtNum(comments) },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-[15px] text-foreground">{item.label}</span>
              <span className="text-[15px] text-foreground">{item.value}</span>
            </div>
          ))}"""
new_breakdown = """          {[
            { label: "Likes", value: likes, set: setEditLikes },
            { label: "Shares", value: shares, set: setEditShares },
            { label: "Saves", value: saves, set: setEditSaves },
            { label: "Comments", value: comments, set: setEditComments },
          ].map((item) => (
            <div key={item.label} 
              className={cn("flex items-center justify-between", isEditMode && "cursor-pointer active:bg-secondary/20 rounded px-2 relative -left-2 w-[calc(100%+16px)] py-1 transition-colors")}
              onClick={() => isEditMode && setEditModal({ label: item.label, value: String(item.value), onSave: item.set })}
            >
              <span className="text-[15px] text-foreground">{item.label}</span>
              <span className="text-[15px] text-foreground">{fmtNum(item.value)}</span>
            </div>
          ))}"""
replace_exact(old_breakdown, new_breakdown, "Metrics breakdown list")

# 12. Audience Modals (Gender, Country, Age)
import re

# We will just replace ALL `onClick={() => {` that are followed by `setEditModal({` inside the audience block to enforce `if(!isEditMode) return;`.
# We find:
# onClick={() => {
#    setEditModal({
#
# And change to:
# onClick={() => {
#    if(!isEditMode) return;
#    setEditModal({
code = code.replace(
    'onClick={() => {\n                    setEditModal({',
    'onClick={() => {\n                    if (!isEditMode) return;\n                    setEditModal({'
)
code = code.replace(
    'onClick={() => {\n                      setEditModal({',
    'onClick={() => {\n                      if (!isEditMode) return;\n                      setEditModal({'
)

# And replace `select-none active:opacity-60"` with `select-none", isEditMode && "cursor-pointer active:bg-secondary/20 transition-colors opacity-90 rounded px-1 -ml-1")`
# Using regex for all span classNames in the map loops:
def modify_span_classnames(text):
    return re.sub(
        r'className="([^"]+) cursor-pointer select-none active:opacity-60"',
        r'className={cn("\1 select-none", isEditMode && "cursor-pointer active:bg-secondary/20 rounded px-1 -ml-1 transition-colors")}',
        text
    )
code = modify_span_classnames(code)

# 13. Remove startLongPress definition
if "const startLongPress" in code:
    code = re.sub(r'  const startLongPress.*?\n  \}, \[\]\);\n\n  const endLongPress.*?\n  \}, \[\]\);\n\n', '', code, flags=re.DOTALL)


if code != original_code:
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("SUCCESS: File saved.")
else:
    print("WARNING: No changes made to file.")
