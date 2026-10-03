import { Link, useRouterState } from "@tanstack/react-router";
import { Inbox, LineChart, PenLine, Rows3, ScrollText, Settings, Unplug } from "lucide-react";
import type { ReactNode } from "react";
import { UserButton } from "@/lib/auth/gates";
import { DeskProvider, useDesk } from "./desk-context";
import { Mark } from "./glyphs";

const NAV = [
  { view: "feed", label: "Feed", icon: Rows3 },
  { view: "compose", label: "Compose", icon: PenLine },
  { view: "connections", label: "Networks", icon: Unplug },
  { view: "history", label: "Ledger", icon: ScrollText },
  { view: "pulse", label: "Pulse", icon: LineChart },
  { view: "inbox", label: "Mentions", icon: Inbox },
  { view: "settings", label: "Desk", icon: Settings },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  return (
    <DeskProvider>
      <ShellFrame>{children}</ShellFrame>
    </DeskProvider>
  );
}

function ShellFrame({ children }: { children: ReactNode }) {
  const { desk, loading, error } = useDesk();
  const view = useRouterState({ select: (s) => (s.location.search as { view?: string }).view ?? "feed" });

  return (
    <div className="min-h-dvh bg-bg text-fg md:grid md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden border-r border-line bg-surface md:flex md:flex-col md:px-4 md:py-6">
        <Link to="/" className="flex items-center gap-2 px-2 font-display text-2xl tracking-tight">
          <Mark />
          NEXUS
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = view === item.view || (item.view === "feed" && !view);
            const badge = item.view === "inbox" ? desk?.counts.inbox : item.view === "history" ? desk?.counts.scheduled : 0;
            return (
              <Link
                key={item.view}
                to="/desk"
                search={{ view: item.view }}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm ${on ? "bg-fg text-bg" : "hover:bg-bg"}`}
              >
                <Icon className="size-4" />
                <span className="flex-1">{item.label}</span>
                {badge ? <span className="text-xs">{badge}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 px-2">
          <UserButton />
          <p className="mt-1 truncate text-xs text-muted">@{desk?.profile.handle ?? "desk"}</p>
        </div>
      </aside>
      <div className="px-4 py-5 pb-28 md:px-8 md:py-8 md:pb-10">
        <div className="mx-auto max-w-5xl">
          {loading ? <p className="text-sm text-muted">Opening the desk…</p> : null}
          {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
          {!loading ? children : null}
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex gap-1 overflow-x-auto border-t border-line bg-surface px-2 py-2 md:hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          const on = view === item.view || (item.view === "feed" && view === "feed");
          return (
            <Link
              key={item.view}
              to="/desk"
              search={{ view: item.view }}
              className={`flex min-h-11 min-w-16 shrink-0 flex-col items-center justify-center rounded-xl px-2 text-xs ${on ? "bg-fg text-bg" : ""}`}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
