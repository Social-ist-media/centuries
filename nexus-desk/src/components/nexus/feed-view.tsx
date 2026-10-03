import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { deleteLens, getThread, listFeed, listLenses, replyToPost, saveLens, toggleBookmark, toggleLike, toggleRepost } from "@/lib/nexus/server";
import { PLATFORM_IDS, PLATFORMS, isPlatform, type PlatformId } from "@/lib/nexus/platforms";
import { useDesk } from "./desk-context";
import { PlatformGlyph } from "./glyphs";
import { PostCard, type CardPost } from "./post-card";

type Lens = { id: string; name: string; platform: string; query: string; bookmarksOnly: boolean };

export function FeedView() {
  const { desk } = useDesk();
  const [platform, setPlatform] = useState<PlatformId | "">("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [bookmarked, setBookmarked] = useState(false);
  const [posts, setPosts] = useState<CardPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lenses, setLenses] = useState<Lens[]>([]);
  const [active, setActive] = useState(0);
  const [thread, setThread] = useState<CardPost[] | null>(null);
  const [reply, setReply] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 280);
    return () => clearTimeout(t);
  }, [search]);

  async function load(reset: boolean, from: string | null) {
    setLoading(true);
    try {
      const res = await listFeed({
        data: { platform, search: debounced, bookmarked, cursor: from },
      });
      setPosts((prev) => (reset ? res.posts : [...prev, ...res.posts]));
      setNext(res.next);
      setCursor(res.next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Feed failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(true, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, debounced, bookmarked]);

  useEffect(() => {
    void listLenses().then((res) => setLenses(res.lenses)).catch(() => setLenses([]));
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "j") setActive((n) => Math.min(posts.length - 1, n + 1));
      if (event.key === "k") setActive((n) => Math.max(0, n - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [posts.length]);

  async function mutate(id: string, kind: "like" | "mark" | "repost") {
    const fn = kind === "like" ? toggleLike : kind === "mark" ? toggleBookmark : toggleRepost;
    const res = await fn({ data: { id } });
    if (!res.ok) return;
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== id) return post;
        if (kind === "like") {
          return { ...post, liked: res.on, likeCount: post.likeCount + (res.on ? 1 : -1) };
        }
        if (kind === "repost") {
          return { ...post, reposted: res.on, repostCount: post.repostCount + (res.on ? 1 : -1) };
        }
        return { ...post, bookmarked: res.on };
      }),
    );
  }

  async function openThread(id: string) {
    const res = await getThread({ data: { id } });
    setThread(res.posts);
    setReply("");
  }

  async function sendReply() {
    if (!thread?.[0]) return;
    const res = await replyToPost({ data: { id: thread[0].id, content: reply } });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setReply("");
    await openThread(thread[0].id);
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <Chip on={!platform && !bookmarked} onClick={() => { setPlatform(""); setBookmarked(false); }}>
            All
          </Chip>
          {PLATFORM_IDS.map((id) => (
            <Chip key={id} on={platform === id} onClick={() => { setPlatform(id); setBookmarked(false); }}>
              <PlatformGlyph platform={id} className="size-5" />
              {PLATFORMS[id].name}
            </Chip>
          ))}
          <Chip on={bookmarked} onClick={() => { setBookmarked(true); setPlatform(""); }}>
            Saved
          </Chip>
        </div>
        <label className="mb-4 block">
          <span className="sr-only">Search the whole desk</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search every post, not just this page"
            className="w-full rounded-full border border-line bg-surface px-4 py-3 text-sm"
          />
        </label>
        {!desk?.connections.length && !loading ? (
          <Empty title="The desk is quiet" body="Open the studio from Connections and five sample networks land in one chronological feed." />
        ) : null}
        <div className="space-y-3">
          {posts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              active={index === active}
              onOpen={() => void openThread(post.id)}
              onLike={() => void mutate(post.id, "like")}
              onBookmark={() => void mutate(post.id, "mark")}
              onRepost={() => void mutate(post.id, "repost")}
            />
          ))}
        </div>
        {loading ? <p className="py-6 text-sm text-muted">Pulling the timeline…</p> : null}
        {!loading && posts.length === 0 && desk?.connections.length ? (
          <Empty title="Nothing in this lens" body="Try another network, or clear the search." />
        ) : null}
        {next ? (
          <button
            type="button"
            className="mt-4 min-h-11 w-full rounded-full border border-line bg-surface text-sm font-medium"
            onClick={() => void load(false, cursor)}
          >
            Older posts
          </button>
        ) : null}
        <p className="mt-3 text-xs text-muted">J and K move through the feed.</p>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-6">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">Lenses</p>
          <p className="mt-1 text-sm text-muted">Save this filter and come back to it.</p>
          <button
            type="button"
            className="mt-3 min-h-11 w-full rounded-full bg-fg px-4 text-sm font-medium text-bg"
            onClick={() => {
              const name = window.prompt("Lens name");
              if (!name) return;
              void saveLens({ data: { name, platform, query: debounced, bookmarksOnly: bookmarked } }).then(async (res) => {
                if (!res.ok) toast.error(res.error);
                else setLenses((await listLenses()).lenses);
              });
            }}
          >
            Save this lens
          </button>
          <ul className="mt-3 space-y-2">
            {lenses.map((lens) => (
              <li key={lens.id} className="flex items-center gap-2">
                <button
                  type="button"
                  className="min-h-11 flex-1 rounded-xl px-2 text-left text-sm hover:bg-bg"
                  onClick={() => {
                    setPlatform(isPlatform(lens.platform) ? lens.platform : "");
                    setSearch(lens.query);
                    setDebounced(lens.query);
                    setBookmarked(lens.bookmarksOnly);
                  }}
                >
                  {lens.name}
                </button>
                <button
                  type="button"
                  className="text-xs text-muted"
                  onClick={() => void deleteLens({ data: { id: lens.id } }).then(() => setLenses((l) => l.filter((item) => item.id !== lens.id)))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
        {thread ? (
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium tracking-wide text-muted uppercase">Thread</p>
              <button type="button" className="text-xs text-muted" onClick={() => setThread(null)}>
                Close
              </button>
            </div>
            <div className="space-y-3">
              {thread.map((post) => (
                <p key={post.id} className="text-sm leading-relaxed">
                  <span className="font-medium">@{post.authorHandle}</span> {post.content}
                </p>
              ))}
            </div>
            <label className="mt-3 block text-sm">
              Reply
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-line bg-bg p-3"
              />
            </label>
            <button type="button" onClick={() => void sendReply()} className="mt-2 min-h-11 rounded-full bg-accent px-4 text-sm font-medium text-accent-fg">
              Send reply
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-sm ${on ? "border-fg bg-fg text-bg" : "border-line bg-surface"}`}
    >
      {children}
    </button>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface p-6">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
