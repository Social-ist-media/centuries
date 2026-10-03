import { Bookmark, Heart, MessageCircle, Repeat2 } from "lucide-react";
import type { ReactNode } from "react";
import { PlatformGlyph } from "./glyphs";
import { PLATFORMS, type PlatformId } from "@/lib/nexus/platforms";

export type CardPost = {
  id: string;
  platform: PlatformId;
  authorHandle: string;
  authorName: string;
  content: string;
  media: string[];
  likeCount: number;
  repostCount: number;
  replyCount: number;
  liked: boolean;
  bookmarked: boolean;
  reposted: boolean;
  isOwn: boolean;
  postedAt: string;
};

const PLATE: Record<string, string> = {
  copper: "bg-accent text-accent-fg",
  ink: "bg-fg text-bg",
  moss: "bg-ok text-surface",
  bone: "bg-line text-fg",
  bsky: "bg-fg text-bg",
  video: "bg-fg text-bg",
};

export function ago(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function Plate({ token }: { token: string }) {
  const [, tone = "ink", label = ""] = token.split(":");
  const video = tone === "video";
  return (
    <div
      className={`flex aspect-[4/3] items-end p-3 ${PLATE[tone] ?? PLATE.ink}`}
    >
      <div>
        {video ? <p className="text-xs font-medium tracking-wide uppercase">Video poster</p> : null}
        <p className="font-display text-lg leading-tight">{label || "Frame"}</p>
      </div>
    </div>
  );
}

function Media({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  const grid =
    urls.length === 1 ? "grid-cols-1" : urls.length === 2 ? "grid-cols-2" : "grid-cols-2";
  return (
    <div className={`mt-3 grid gap-1 overflow-hidden rounded-xl ${grid}`}>
      {urls.map((url) =>
        url.startsWith("nx:") ? (
          <Plate key={url} token={url} />
        ) : (
          <img
            key={url}
            src={url}
            alt=""
            className="aspect-[4/3] w-full object-cover"
          />
        ),
      )}
    </div>
  );
}

export function PostCard({
  post,
  active,
  onOpen,
  onLike,
  onBookmark,
  onRepost,
}: {
  post: CardPost;
  active?: boolean;
  onOpen: () => void;
  onLike: () => void;
  onBookmark: () => void;
  onRepost: () => void;
}) {
  return (
    <article
      className={`rounded-2xl border bg-surface p-4 ${active ? "border-accent" : "border-line"}`}
    >
      <header className="flex items-center gap-3">
        <PlatformGlyph platform={post.platform} className="size-9" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="truncate font-medium">{post.authorName}</p>
            {post.isOwn ? (
              <span className="rounded-full bg-ok-soft px-2 py-0.5 text-xs font-medium text-ok">Yours</span>
            ) : null}
          </div>
          <p className="truncate text-sm text-muted">
            @{post.authorHandle} · {PLATFORMS[post.platform].name} · {ago(post.postedAt)}
          </p>
        </div>
      </header>
      <button type="button" onClick={onOpen} className="mt-3 block w-full text-left">
        <p className="whitespace-pre-wrap text-base leading-relaxed">{post.content}</p>
        <Media urls={post.media} />
      </button>
      <div className="mt-3 flex items-center gap-1 text-sm text-muted">
        <Action label="Reply" count={post.replyCount} onClick={onOpen}>
          <MessageCircle className="size-4" />
        </Action>
        <Action label="Repost" count={post.repostCount} on={post.reposted} onClick={onRepost}>
          <Repeat2 className="size-4" />
        </Action>
        <Action label="Like" count={post.likeCount} on={post.liked} onClick={onLike}>
          <Heart className={`size-4 ${post.liked ? "fill-current" : ""}`} />
        </Action>
        <Action label="Bookmark" on={post.bookmarked} onClick={onBookmark}>
          <Bookmark className={`size-4 ${post.bookmarked ? "fill-current" : ""}`} />
        </Action>
      </div>
    </article>
  );
}

function Action({
  label,
  count,
  on,
  onClick,
  children,
}: {
  label: string;
  count?: number;
  on?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 ${on ? "text-accent" : "hover:text-fg"}`}
    >
      {children}
      {typeof count === "number" ? <span>{count}</span> : null}
    </button>
  );
}
