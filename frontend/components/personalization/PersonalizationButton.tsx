"use client";

import { useState } from "react";

import { Avatar } from "@/components/avatar/Avatar";
import { displayName } from "@/lib/api";

import { useCurrentAgent } from "./CurrentAgentProvider";
import { PersonalizationPanel } from "./PersonalizationPanel";

export function PersonalizationButton() {
  const { agent } = useCurrentAgent();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open personalization"
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card"
      >
        <Avatar
          name={displayName(agent)}
          avatarUrl={agent.avatar_url}
          avatarPreset={agent.avatar_preset}
          backgroundColor={agent.avatar_color}
          frame={agent.avatar_frame as never}
          status={agent.status_effect as never}
          size="sm"
        />
      </button>
      {open && <PersonalizationPanel onClose={() => setOpen(false)} />}
    </>
  );
}
