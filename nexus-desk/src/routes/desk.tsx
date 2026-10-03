import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ComposeView } from "@/components/nexus/compose-view";
import { ConnectionsView } from "@/components/nexus/connections-view";
import { FeedView } from "@/components/nexus/feed-view";
import { HistoryView } from "@/components/nexus/history-view";
import { InboxView } from "@/components/nexus/inbox-view";
import { PulseView } from "@/components/nexus/pulse-view";
import { SettingsView } from "@/components/nexus/settings-view";
import { Shell } from "@/components/nexus/shell";

const VIEWS = ["feed", "compose", "connections", "history", "pulse", "inbox", "settings"] as const;
type View = (typeof VIEWS)[number];

export const Route = createFileRoute("/desk")({
  validateSearch: (search: Record<string, unknown>): { view: View } => {
    const view = String(search.view ?? "feed");
    return { view: (VIEWS as readonly string[]).includes(view) ? (view as View) : "feed" };
  },
  component: DeskPage,
});

function DeskPage() {
  const { view } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <main className="grid min-h-dvh place-items-center text-sm text-muted">Opening the desk…</main>;
  }
  if (!user) return <RedirectToSignIn />;
  return (
    <Shell>
      {view === "compose" ? <ComposeView /> : null}
      {view === "connections" ? <ConnectionsView /> : null}
      {view === "history" ? <HistoryView /> : null}
      {view === "pulse" ? <PulseView /> : null}
      {view === "inbox" ? <InboxView /> : null}
      {view === "settings" ? <SettingsView /> : null}
      {view === "feed" ? <FeedView /> : null}
    </Shell>
  );
}
