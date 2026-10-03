import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { assistCopy, deleteDraft, listDrafts, publishPost } from "@/lib/nexus/server";
import { PLATFORMS, tightestLimit, type PlatformId } from "@/lib/nexus/platforms";
import { useDesk } from "./desk-context";
import { PlatformGlyph } from "./glyphs";

type Job = {
  id: string;
  status: string;
  scheduledAt: string | null;
  targets: { platform: PlatformId; status: string; error: string; latencyMs: number }[];
};

export function ComposeView() {
  const { desk, refresh } = useDesk();
  const connected = desk?.connections.map((c) => c.platform) ?? [];
  const [picked, setPicked] = useState<PlatformId[]>([]);
  const [content, setContent] = useState("");
  const [variants, setVariants] = useState<Partial<Record<PlatformId, string>>>({});
  const [showVariants, setShowVariants] = useState(false);
  const [scheduleOn, setScheduleOn] = useState(false);
  const [when, setWhen] = useState("");
  const [idem, setIdem] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [thread, setThread] = useState<string[] | null>(null);
  const [drafts, setDrafts] = useState<{ id: string; content: string; platforms: PlatformId[] }[]>([]);
  const [draftId, setDraftId] = useState("");

  useEffect(() => {
    if (connected.length && picked.length === 0) setPicked(connected);
  }, [connected, picked.length]);

  useEffect(() => {
    void listDrafts().then((res) => setDrafts(res.drafts)).catch(() => setDrafts([]));
  }, []);

  const limit = tightestLimit(picked);
  const counts = useMemo(
    () =>
      picked.map((platform) => {
        const text = variants[platform]?.trim() || content;
        return { platform, length: text.length, limit: PLATFORMS[platform].limit };
      }),
    [picked, variants, content],
  );

  async function send(parts: string[]) {
    setBusy(true);
    try {
      let last: Job | null = null;
      for (let i = 0; i < parts.length; i += 1) {
        const res = await publishPost({
          data: {
            content: parts[i],
            platforms: picked,
            variants: i === 0 ? variants : {},
            scheduledAt: parts.length === 1 && scheduleOn ? when || null : null,
            idempotencyKey: `${idem}:${i}`,
          },
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        last = res.job;
        if (res.reused) toast.message("Already sent — that click did not double-post.");
      }
      setJob(last);
      setContent("");
      setVariants({});
      setThread(null);
      setWhen("");
      setScheduleOn(false);
      setIdem(crypto.randomUUID());
      toast.success(scheduleOn && when && parts.length === 1 ? "Queued" : "Sent to the ledger");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function assist(mode: "tighten" | "warmer" | "thread" | "alt") {
    const res = await assistCopy({ data: { text: content, mode, limit } });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if ("posts" in res && res.posts) {
      setThread(res.posts);
      return;
    }
    if ("text" in res && res.text) {
      if (mode === "alt") toast.message(res.text);
      else setContent(res.text);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <form
        className="rounded-2xl border border-line bg-surface p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void send(thread ?? [content]);
        }}
      >
        <div className="flex items-end justify-between gap-3">
          <h1 className="font-display text-3xl">Write once</h1>
          <p className={`text-sm ${content.length > limit ? "text-danger" : "text-muted"}`}>
            {content.length}/{limit}
          </p>
        </div>
        <p className="mt-1 text-sm text-muted">The tightest selected network sets the ring. Tune a cut when one network needs a different sentence.</p>
        {thread ? (
          <div className="mt-4 space-y-3">
            {thread.map((part, index) => (
              <label key={index} className="block text-sm">
                Post {index + 1}
                <textarea
                  value={part}
                  rows={3}
                  onChange={(e) => setThread((prev) => prev?.map((item, i) => (i === index ? e.target.value : item)) ?? null)}
                  className="mt-1 w-full rounded-xl border border-line bg-bg p-3"
                />
              </label>
            ))}
            <button type="button" className="text-sm text-muted" onClick={() => setThread(null)}>
              Back to a single post
            </button>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={7}
            required
            placeholder="The short version first."
            className="mt-4 w-full rounded-xl border border-line bg-bg p-4 text-base leading-relaxed"
          />
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {(connected.length ? connected : []).map((platform) => {
            const on = picked.includes(platform);
            const stat = counts.find((item) => item.platform === platform);
            const over = stat ? stat.length > stat.limit : false;
            return (
              <button
                key={platform}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked((prev) => (on ? prev.filter((id) => id !== platform) : [...prev, platform]))}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm ${on ? "border-fg bg-fg text-bg" : "border-line"} ${over ? "text-danger" : ""}`}
              >
                <PlatformGlyph platform={platform} className="size-5" />
                {PLATFORMS[platform].name}
                <span className="opacity-70">{stat ? `${stat.length}/${stat.limit}` : PLATFORMS[platform].limit}</span>
              </button>
            );
          })}
        </div>
        {!connected.length ? <p className="mt-3 text-sm text-muted">Connect a network before sending. You can still save a draft.</p> : null}
        <button type="button" className="mt-4 text-sm font-medium text-accent" onClick={() => setShowVariants((v) => !v)}>
          {showVariants ? "Hide per-network cuts" : "Tune per network"}
        </button>
        {showVariants ? (
          <div className="mt-3 space-y-3">
            {picked.map((platform) => (
              <label key={platform} className="block text-sm">
                {PLATFORMS[platform].name} cut
                <textarea
                  value={variants[platform] ?? ""}
                  onChange={(e) => setVariants((prev) => ({ ...prev, [platform]: e.target.value }))}
                  rows={2}
                  placeholder="Leave blank to use the main draft"
                  className="mt-1 w-full rounded-xl border border-line bg-bg p-3"
                />
              </label>
            ))}
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={scheduleOn} onChange={(e) => setScheduleOn(e.target.checked)} />
            Send later
          </label>
          {scheduleOn ? (
            <label className="text-sm">
              <span className="sr-only">Send time</span>
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                required
                className="block min-h-11 rounded-xl border border-line bg-bg px-3"
              />
            </label>
          ) : null}
          <button type="submit" disabled={busy || !connected.length} className="min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-fg disabled:opacity-50">
            {scheduleOn ? "Queue it" : "Publish"}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-full border border-line px-4 text-sm"
            onClick={() =>
              void saveDraftSafe(content, picked, draftId).then((id) => {
                if (!id) return;
                setDraftId(id);
                toast.success("Draft kept");
                void listDrafts().then((res) => setDrafts(res.drafts));
              })
            }
          >
            Save draft
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["tighten", "Tighten"],
              ["warmer", "Warmer"],
              ["thread", "Make a thread"],
              ["alt", "Alt text"],
            ] as const
          ).map(([mode, label]) => (
            <button key={mode} type="button" onClick={() => void assist(mode)} className="min-h-11 rounded-full border border-line px-3 text-sm">
              {label}
            </button>
          ))}
        </div>
        {job ? (
          <ul className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            {job.targets.map((target) => (
              <li key={target.platform} className="flex items-center justify-between gap-3">
                <span>{PLATFORMS[target.platform].name}</span>
                <span className={target.status === "success" ? "text-ok" : target.status === "failed" ? "text-danger" : "text-muted"}>
                  {target.status}
                  {target.error ? ` — ${target.error}` : ""}
                  {target.latencyMs ? ` · ${target.latencyMs}ms` : ""}
                </span>
              </li>
            ))}
            {job.scheduledAt ? <li className="text-muted">Scheduled {new Date(job.scheduledAt).toLocaleString()}</li> : null}
          </ul>
        ) : null}
      </form>
      <aside className="rounded-2xl border border-line bg-surface p-4">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Drafts</p>
        <ul className="mt-3 space-y-3">
          {drafts.length === 0 ? <li className="text-sm text-muted">Nothing saved yet.</li> : null}
          {drafts.map((draft) => (
            <li key={draft.id}>
              <button
                type="button"
                className="w-full text-left text-sm leading-relaxed"
                onClick={() => {
                  setContent(draft.content);
                  setPicked(draft.platforms.length ? draft.platforms : connected);
                  setDraftId(draft.id);
                  setThread(null);
                }}
              >
                {draft.content.slice(0, 140)}
              </button>
              <button
                type="button"
                className="mt-1 text-xs text-muted"
                onClick={() => void deleteDraft({ data: { id: draft.id } }).then(() => setDrafts((d) => d.filter((item) => item.id !== draft.id)))}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

async function saveDraftSafe(content: string, platforms: PlatformId[], id: string) {
  const { saveDraft } = await import("@/lib/nexus/server");
  const res = await saveDraft({ data: { id: id || undefined, content, platforms } });
  if (!res.ok) {
    toast.error(res.error);
    return "";
  }
  return res.id;
}
