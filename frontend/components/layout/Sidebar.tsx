"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  LayoutDashboard,
  Settings,
  Trophy,
  Tv,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/contests", label: "Contests", icon: Trophy },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar hidden md:flex w-60 shrink-0 flex-col border-r">
      <div className="sidebar-divider flex h-16 items-center gap-3 border-b px-5">
        <span className="bg-gradient-primary flex h-9 w-9 items-center justify-center rounded-xl shadow-lg">
          <Trophy className="h-[18px] w-[18px] text-white" />
        </span>
        <div className="leading-tight">
          <span className="font-display text-[15px] font-bold tracking-tight">
            Agency Arena
          </span>
          <p className="sidebar-muted text-[10px] font-medium uppercase tracking-[0.14em]">
            Sales HQ
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5">
        <p className="sidebar-muted px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
          Command Center
        </p>
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "sidebar-link group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                active && "sidebar-link-active",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  !active && "group-hover:scale-110",
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-divider border-t px-3 py-4">
        <Link
          href="/tv"
          target="_blank"
          rel="noopener noreferrer"
          className="sidebar-link group flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold transition-all duration-200 hover:border-white/20"
        >
          <Tv className="h-4 w-4" />
          TV mode
          <span className="sidebar-muted ml-auto text-[10px] uppercase tracking-wider">
            new tab
          </span>
        </Link>
        <p className="sidebar-muted mt-3 px-3 text-[11px]">
          v0.1.0 · local insurance office
        </p>
      </div>
    </aside>
  );
}
