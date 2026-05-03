import type { Metadata } from "next";

import { CelebrationProvider } from "@/components/celebration/CelebrationProvider";
import { AppShell } from "@/components/layout/AppShell";
import { CurrentAgentProvider } from "@/components/personalization/CurrentAgentProvider";
import { ManagerSettingsEffects } from "@/components/settings/ManagerSettingsEffects";
import { ManagerSettingsProvider } from "@/components/settings/ManagerSettingsProvider";
import { SoundProvider } from "@/components/sound/SoundProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { api, type Agent, type Settings } from "@/lib/api";
import {
  DEFAULT_THEME,
  generateThemeStylesheet,
  THEMES,
  type ThemeKey,
} from "@/lib/themes";

import "./globals.css";

export const metadata: Metadata = {
  title: "Agency Arena",
  description: "Sales gamification for the local insurance office.",
};

const FALLBACK_AGENT: Agent = {
  id: 0,
  name: "Guest",
  role: "guest",
  avatar_url: null,
  avatar_preset: null,
  avatar_color: null,
  avatar_frame: null,
  status_effect: null,
  nickname: null,
  title: null,
  active: true,
  start_date: "1970-01-01",
  created_at: "1970-01-01T00:00:00",
  updated_at: "1970-01-01T00:00:00",
};

async function loadInitial(): Promise<{ theme: ThemeKey; agent: Agent }> {
  try {
    const settings = await api<Settings>("/settings");
    const theme = (THEMES as Record<string, unknown>)[settings.theme]
      ? (settings.theme as ThemeKey)
      : DEFAULT_THEME;
    try {
      const agent = await api<Agent>(`/agents/${settings.current_agent_id}`);
      return { theme, agent };
    } catch {
      const all = await api<Agent[]>("/agents");
      return { theme, agent: all[0] ?? FALLBACK_AGENT };
    }
  } catch {
    return { theme: DEFAULT_THEME, agent: FALLBACK_AGENT };
  }
}

// Compute the full theme stylesheet once at module load — it's static
// data driven by lib/themes.ts.
const THEME_STYLESHEET = generateThemeStylesheet();

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, agent } = await loadInitial();
  const initialAnimation = THEMES[theme].animationIntensity;

  return (
    <html lang="en" data-theme={theme} data-animation={initialAnimation}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: THEME_STYLESHEET }} />
      </head>
      <body>
        <ThemeProvider initialTheme={theme}>
          <ManagerSettingsProvider>
            <ManagerSettingsEffects />
            <SoundProvider>
              <CurrentAgentProvider initialAgent={agent}>
                <CelebrationProvider>
                  <AppShell>{children}</AppShell>
                </CelebrationProvider>
              </CurrentAgentProvider>
            </SoundProvider>
          </ManagerSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
