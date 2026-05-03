import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/** Page-level shell: sidebar + topbar around a scrollable main area.
 *
 * Keeps `layout.tsx` focused on providers (Theme, Sound, CurrentAgent,
 * Celebration) and lets pages that need a different chrome (e.g. /tv,
 * which renders fullscreen) opt out by replacing this wrapper.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
