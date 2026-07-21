import { Bell, Search } from "lucide-react";

import { CelebrationToggle } from "@/components/celebration/CelebrationToggle";
import { PersonalizationButton } from "@/components/personalization/PersonalizationButton";
import { SoundControl } from "@/components/sound/SoundControl";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

export function TopBar() {
  return (
    <header className="app-topbar sticky top-0 z-30 flex h-16 items-center justify-between border-b px-6">
      <div className="flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/30">
        <Search className="h-4 w-4" />
        <span>Search agents, activities…</span>
      </div>
      <div className="flex items-center gap-1.5">
        <ThemeSwitcher />
        <SoundControl />
        <CelebrationToggle />
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gradient-primary ring-2 ring-card" />
        </button>
        <span className="mx-1.5 h-6 w-px bg-border" aria-hidden />
        <PersonalizationButton />
      </div>
    </header>
  );
}
