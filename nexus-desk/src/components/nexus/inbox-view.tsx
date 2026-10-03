import { useEffect, useState } from "react";
import { listInbox, toggleBookmark, toggleLike, toggleRepost } from "@/lib/nexus/server";
import { PostCard, type CardPost } from "./post-card";

export function InboxView() {
  const [handle, setHandle] = useState("");
  const [posts, setPosts] = useState<CardPost[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await listInbox();
    setHandle(res.handle);
    setPosts(res.posts);
    setLoading(false);
  }

  useEffect(() => {
    void load().catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl">Mentions</h1>
      <p className="mt-2 text-sm text-muted">Posts on your desk that name @{handle || "you"}.</p>
      {loading ? <p className="mt-6 text-sm text-muted">Looking…</p> : null}
      {!loading && posts.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line bg-surface p-6 text-sm text-muted">
          No mentions yet. The studio seeds a few once your handle is set.
        </p>
      ) : null}
      <div className="mt-6 space-y-3">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onOpen={() => undefined}
            onLike={() => void toggleLike({ data: { id: post.id } }).then(load)}
            onBookmark={() => void toggleBookmark({ data: { id: post.id } }).then(load)}
            onRepost={() => void toggleRepost({ data: { id: post.id } }).then(load)}
          />
        ))}
      </div>
    </div>
  );
}
