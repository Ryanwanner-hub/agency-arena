import { Bell, Search } from "lucide-react";

import { CelebrationToggle } from "@/components/celebration/CelebrationToggle";
import { PersonalizationButton } from "@/components/personalization/PersonalizationButton";
import { SoundControl } from "@/components/sound/SoundControl";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

export function TopBar() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Search className="h-4 w-4" />
        <span>Search agents, activities…</span>
      </div>
      <div className="flex items-center gap-3">
        <ThemeSwitcher />
        <SoundControl />
        <CelebrationToggle />
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
        </button>
        <PersonalizationButton />
      </div>
    </header>
  );
}
