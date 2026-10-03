import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import { buildTimeline, overLimit, studioHandle, studioInstance } from "./demo";
import { isPlatform, PLATFORMS, PLATFORM_IDS, type PlatformId } from "./platforms";

type Profile = {
  displayName: string;
  bio: string;
  handle: string;
  theme: "paper" | "ink";
  email: string;
};

type Connection = {
  id: string;
  platform: PlatformId;
  handle: string;
  displayName: string;
  instance: string;
  mode: string;
  status: string;
  lastError: string;
  lastSyncedAt: string | null;
};

type FeedPost = {
  id: string;
  connectionId: string | null;
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
  replyTo: string | null;
  postedAt: string;
};

type Target = {
  platform: PlatformId;
  status: string;
  error: string;
  latencyMs: number;
  externalId: string;
};

type Job = {
  id: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  targets: Target[];
};

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return "";
}

function isoOrNull(value: unknown): string | null {
  if (value == null) return null;
  const s = iso(value);
  return s || null;
}

function cleanText(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+\n/g, "\n")
    .trim()
    .slice(0, max);
}

function slug(value: string): string {
  const s = value
    .toLowerCase()
    .replace(/@.*/, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  return s || "desk";
}

function parseMedia(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).slice(0, 4);
  try {
    const parsed = JSON.parse(String(raw ?? "[]")) as unknown;
    return Array.isArray(parsed) ? parsed.map(String).slice(0, 4) : [];
  } catch {
    return [];
  }
}

function mapPost(row: Record<string, unknown>): FeedPost {
  return {
    id: String(row.id),
    connectionId: row.connection_id ? String(row.connection_id) : null,
    platform: String(row.platform) as PlatformId,
    authorHandle: String(row.author_handle),
    authorName: String(row.author_name),
    content: String(row.content),
    media: parseMedia(row.media_urls),
    likeCount: Number(row.like_count ?? 0),
    repostCount: Number(row.repost_count ?? 0),
    replyCount: Number(row.reply_count ?? 0),
    liked: Boolean(row.liked),
    bookmarked: Boolean(row.bookmarked),
    reposted: Boolean(row.reposted),
    isOwn: Boolean(row.is_own),
    replyTo: row.reply_to ? String(row.reply_to) : null,
    postedAt: iso(row.posted_at),
  };
}

async function ensureProfile(sql: Sql, userId: string): Promise<Profile> {
  const users = await sql<{ name: string; email: string }>`
    select "name", "email" from "user" where "id" = ${userId} limit 1
  `;
  const name = users[0]?.name?.trim() || "Desk";
  const email = users[0]?.email ?? "";
  await sql`
    insert into profiles (user_id, display_name, handle)
    values (${userId}, ${name}, ${slug(email || name)})
    on conflict (user_id) do nothing
  `;
  const rows = await sql<Record<string, unknown>>`
    select display_name, bio, handle, theme from profiles where user_id = ${userId}
  `;
  const row = rows[0] ?? {};
  const theme = row.theme === "ink" ? "ink" : "paper";
  return {
    displayName: String(row.display_name ?? name),
    bio: String(row.bio ?? ""),
    handle: String(row.handle ?? slug(name)),
    theme,
    email,
  };
}

async function insertSeed(
  sql: Sql,
  userId: string,
  connectionId: string,
  platform: PlatformId,
  mention: string,
) {
  const posts = buildTimeline(platform, mention);
  for (const post of posts) {
    const posted = new Date(Date.now() - post.minutesAgo * 60_000).toISOString();
    const inserted = await sql<{ id: string }>`
      insert into feed_posts (
        id, user_id, connection_id, platform, external_id, author_handle, author_name,
        content, media_urls, like_count, repost_count, reply_count, liked, bookmarked, posted_at
      ) values (
        ${crypto.randomUUID()}, ${userId}, ${connectionId}, ${platform},
        ${`demo:${platform}:${post.key}`}, ${post.authorHandle}, ${post.authorName},
        ${post.content}, ${JSON.stringify(post.media)}, ${post.likes}, ${post.reposts},
        ${post.replies}, ${Boolean(post.liked)}, ${Boolean(post.bookmarked)}, ${posted}
      )
      on conflict (user_id, platform, external_id) do nothing
      returning id
    `;
    const parentId = inserted[0]?.id;
    if (!parentId || !post.thread) continue;
    for (const reply of post.thread) {
      const at = new Date(Date.now() - reply.minutesAgo * 60_000).toISOString();
      await sql`
        insert into feed_posts (
          id, user_id, connection_id, platform, external_id, author_handle, author_name,
          content, reply_to, posted_at, reply_count
        ) values (
          ${crypto.randomUUID()}, ${userId}, ${connectionId}, ${platform},
          ${`demo:${platform}:${reply.key}`}, ${reply.authorHandle}, ${reply.authorName},
          ${reply.content}, ${parentId}, ${at}, 0
        )
        on conflict (user_id, platform, external_id) do nothing
      `;
    }
  }
}

function publicHost(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal" ||
    host === "169.254.169.254" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    host.includes(":")
  ) {
    return null;
  }
  return host;
}

async function pullBluesky(handle: string): Promise<
  | { ok: true; posts: { externalId: string; authorHandle: string; authorName: string; content: string; media: string[]; postedAt: string; likes: number; reposts: number; replies: number }[] }
  | { ok: false; error: string }
> {
  const actor = handle.replace(/^@/, "");
  try {
    const res = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(actor)}&limit=12&filter=posts_and_author_threads`,
      { signal: AbortSignal.timeout(8000), redirect: "manual" },
    );
    if (!res.ok) return { ok: false, error: `Bluesky returned ${res.status}. Studio sample loaded instead.` };
    const body = (await res.json()) as {
      feed?: {
        post?: {
          uri?: string;
          likeCount?: number;
          replyCount?: number;
          repostCount?: number;
          author?: { handle?: string; displayName?: string };
          record?: { text?: string; createdAt?: string };
          embed?: { images?: { thumb?: string; fullsize?: string }[] };
        };
      }[];
    };
    const posts = (body.feed ?? [])
      .map((item) => item.post)
      .filter((post) => post?.record?.text && post.uri)
      .slice(0, 12)
      .map((post) => {
        const images = (post?.embed?.images ?? [])
          .map((img) => img.thumb || img.fullsize || "")
          .filter((url) => url.startsWith("https://") && url.includes("bsky.app"))
          .slice(0, 4);
        return {
          externalId: String(post?.uri),
          authorHandle: post?.author?.handle || actor,
          authorName: post?.author?.displayName || actor,
          content: cleanText(post?.record?.text, 2000),
          media: images,
          postedAt: post?.record?.createdAt || new Date().toISOString(),
          likes: Number(post?.likeCount ?? 0),
          reposts: Number(post?.repostCount ?? 0),
          replies: Number(post?.replyCount ?? 0),
        };
      });
    if (!posts.length) return { ok: false, error: "That Bluesky handle has no public posts. Studio sample loaded instead." };
    return { ok: true, posts };
  } catch {
    return { ok: false, error: "Could not reach Bluesky. Studio sample loaded instead." };
  }
}

async function pullMastodon(instance: string, handle: string) {
  const host = publicHost(instance);
  if (!host) return { ok: false as const, error: "Use a public https instance, not a local address." };
  const acct = handle.replace(/^@/, "").split("@")[0];
  try {
    const lookup = await fetch(`https://${host}/api/v1/accounts/lookup?acct=${encodeURIComponent(acct)}`, {
      signal: AbortSignal.timeout(8000),
      redirect: "manual",
    });
    if (!lookup.ok) {
      return { ok: false as const, error: `Instance returned ${lookup.status}. Studio sample loaded instead.` };
    }
    const account = (await lookup.json()) as { id?: string; display_name?: string; username?: string };
    if (!account.id) return { ok: false as const, error: "Account lookup failed. Studio sample loaded instead." };
    const statuses = await fetch(`https://${host}/api/v1/accounts/${account.id}/statuses?limit=12&exclude_replies=true`, {
      signal: AbortSignal.timeout(8000),
      redirect: "manual",
    });
    if (!statuses.ok) return { ok: false as const, error: "Could not read that timeline. Studio sample loaded instead." };
    const list = (await statuses.json()) as {
      id?: string;
      content?: string;
      created_at?: string;
      favourites_count?: number;
      reblogs_count?: number;
      replies_count?: number;
      media_attachments?: { type?: string; preview_url?: string; url?: string }[];
    }[];
    const posts = list
      .filter((status) => status.id)
      .slice(0, 12)
      .map((status) => ({
        externalId: `mstdn:${host}:${status.id}`,
        authorHandle: account.username || acct,
        authorName: account.display_name || acct,
        content: cleanText(String(status.content ?? "").replace(/<br\s*\/?>/gi, "\n"), 2000),
        media: (status.media_attachments ?? [])
          .filter((m) => m.type === "image")
          .map((m) => m.preview_url || "")
          .filter((url) => url.startsWith(`https://${host}/`))
          .slice(0, 4),
        postedAt: status.created_at || new Date().toISOString(),
        likes: Number(status.favourites_count ?? 0),
        reposts: Number(status.reblogs_count ?? 0),
        replies: Number(status.replies_count ?? 0),
      }))
      .filter((post) => post.content);
    if (!posts.length) return { ok: false as const, error: "No public statuses. Studio sample loaded instead." };
    return { ok: true as const, posts };
  } catch {
    return { ok: false as const, error: "Could not reach that instance. Studio sample loaded instead." };
  }
}

async function insertRemote(
  sql: Sql,
  userId: string,
  connectionId: string,
  platform: PlatformId,
  posts: {
    externalId: string;
    authorHandle: string;
    authorName: string;
    content: string;
    media: string[];
    postedAt: string;
    likes: number;
    reposts: number;
    replies: number;
  }[],
) {
  for (const post of posts) {
    await sql`
      insert into feed_posts (
        id, user_id, connection_id, platform, external_id, author_handle, author_name,
        content, media_urls, like_count, repost_count, reply_count, posted_at
      ) values (
        ${crypto.randomUUID()}, ${userId}, ${connectionId}, ${platform}, ${post.externalId},
        ${post.authorHandle}, ${post.authorName}, ${post.content}, ${JSON.stringify(post.media)},
        ${post.likes}, ${post.reposts}, ${post.replies}, ${post.postedAt}
      )
      on conflict (user_id, platform, external_id) do nothing
    `;
  }
}

async function loadConnections(sql: Sql, userId: string): Promise<Connection[]> {
  const rows = await sql<Record<string, unknown>>`
    select id, platform, handle, display_name, instance, mode, status, last_error, last_synced_at
    from connections where user_id = ${userId} order by created_at asc
  `;
  return rows.filter((row) => isPlatform(String(row.platform))).map((row) => ({
    id: String(row.id),
    platform: String(row.platform) as PlatformId,
    handle: String(row.handle),
    displayName: String(row.display_name ?? ""),
    instance: String(row.instance ?? ""),
    mode: String(row.mode),
    status: String(row.status),
    lastError: String(row.last_error ?? ""),
    lastSyncedAt: isoOrNull(row.last_synced_at),
  }));
}

async function deliverJob(sql: Sql, userId: string, jobId: string, profile: Profile) {
  const jobs = await sql<Record<string, unknown>>`
    select id, content, variants from publish_jobs where id = ${jobId} and user_id = ${userId}
  `;
  const job = jobs[0];
  if (!job) return;
  const base = String(job.content);
  let variants: Record<string, string> = {};
  try {
    variants = JSON.parse(String(job.variants ?? "{}")) as Record<string, string>;
  } catch {
    variants = {};
  }
  const targets = await sql<Record<string, unknown>>`
    select id, platform from publish_targets where job_id = ${jobId} and user_id = ${userId} and status = 'pending'
  `;
  const connections = await loadConnections(sql, userId);
  for (const target of targets) {
    const platform = String(target.platform);
    const started = Date.now();
    if (!isPlatform(platform)) {
      await sql`update publish_targets set status = 'failed', error = 'Unknown network' where id = ${String(target.id)}`;
      continue;
    }
    const text = cleanText(variants[platform] || base, 5000);
    const link = connections.find((c) => c.platform === platform && c.status !== "disconnected");
    let status = "success";
    let error = "";
    if (!link) {
      status = "failed";
      error = "Not connected";
    } else if (overLimit(platform, text)) {
      status = "failed";
      error = `Over the ${PLATFORMS[platform].limit} character limit`;
    }
    const latency = 48 + (text.length % 140);
    const externalId = status === "success" ? `nx:${platform}:${jobId.slice(0, 8)}` : "";
    await sql`
      update publish_targets
      set status = ${status}, error = ${error}, latency_ms = ${latency}, external_id = ${externalId}
      where id = ${String(target.id)}
    `;
    if (status === "success") {
      await sql`
        insert into feed_posts (
          id, user_id, connection_id, platform, external_id, author_handle, author_name,
          content, is_own, posted_at
        ) values (
          ${crypto.randomUUID()}, ${userId}, ${link?.id ?? null}, ${platform}, ${externalId},
          ${profile.handle}, ${profile.displayName}, ${text}, true, ${new Date().toISOString()}
        )
        on conflict (user_id, platform, external_id) do nothing
      `;
    }
    void started;
  }
  await sql`update publish_jobs set status = 'sent' where id = ${jobId} and user_id = ${userId}`;
}

async function flushDue(sql: Sql, userId: string, profile: Profile) {
  const due = await sql<{ id: string }>`
    select id from publish_jobs
    where user_id = ${userId} and status = 'scheduled' and scheduled_at is not null and scheduled_at <= now()
  `;
  for (const job of due) await deliverJob(sql, userId, job.id, profile);
}

async function loadJobs(sql: Sql, userId: string): Promise<Job[]> {
  const jobs = await sql<Record<string, unknown>>`
    select id, content, status, scheduled_at, created_at
    from publish_jobs where user_id = ${userId}
    order by created_at desc limit 40
  `;
  if (!jobs.length) return [];
  const ids = jobs.map((job) => String(job.id));
  const params = ids.map((_, i) => `$${i + 2}`).join(", ");
  const targets = await sql.query<Record<string, unknown>>(
    `select job_id, platform, status, error, latency_ms, external_id from publish_targets where user_id = $1 and job_id in (${params})`,
    [userId, ...ids],
  );
  return jobs.map((job) => ({
    id: String(job.id),
    content: String(job.content),
    status: String(job.status),
    scheduledAt: isoOrNull(job.scheduled_at),
    createdAt: iso(job.created_at),
    targets: targets
      .filter((target) => String(target.job_id) === String(job.id) && isPlatform(String(target.platform)))
      .map((target) => ({
        platform: String(target.platform) as PlatformId,
        status: String(target.status),
        error: String(target.error ?? ""),
        latencyMs: Number(target.latency_ms ?? 0),
        externalId: String(target.external_id ?? ""),
      })),
  }));
}

export const getDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    await flushDue(sql, context.userId, profile);
    const connections = await loadConnections(sql, context.userId);
    const counts = await sql<{ feed: number; scheduled: number; inbox: number; drafts: number }>`
      select
        (select count(*) from feed_posts where user_id = ${context.userId} and reply_to is null) as feed,
        (select count(*) from publish_jobs where user_id = ${context.userId} and status = 'scheduled') as scheduled,
        (select count(*) from feed_posts where user_id = ${context.userId} and is_own = false and content ilike ${`%@${profile.handle}%`}) as inbox,
        (select count(*) from drafts where user_id = ${context.userId}) as drafts
    `;
    const row = counts[0];
    return {
      profile,
      connections,
      counts: {
        feed: Number(row?.feed ?? 0),
        scheduled: Number(row?.scheduled ?? 0),
        inbox: Number(row?.inbox ?? 0),
        drafts: Number(row?.drafts ?? 0),
      },
    };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .validator((input: { displayName?: string; bio?: string; handle?: string; theme?: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const displayName = cleanText(data.displayName ?? "", 80);
    const bio = cleanText(data.bio ?? "", 280);
    const handle = slug(cleanText(data.handle ?? "", 32));
    const theme = data.theme === "ink" ? "ink" : "paper";
    if (!displayName) return { ok: false as const, error: "Name is required." };
    await sql`
      update profiles
      set display_name = ${displayName}, bio = ${bio}, handle = ${handle}, theme = ${theme}
      where user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

async function connectOne(
  sql: Sql,
  userId: string,
  profile: Profile,
  platform: PlatformId,
  handle: string,
  instance: string,
  source: "studio" | "public",
) {
  const existing = await sql<{ id: string }>`
    select id from connections where user_id = ${userId} and platform = ${platform} and handle = ${handle}
  `;
  if (existing[0]) return { ok: false as const, error: `${handle} is already on ${PLATFORMS[platform].name}.` };
  const id = crypto.randomUUID();
  let mode = "demo";
  let lastError = "";
  let imported = false;
  if (source === "public" && platform === "bluesky") {
    const pulled = await pullBluesky(handle);
    if (pulled.ok) {
      mode = "public";
      await sql`
        insert into connections (id, user_id, platform, handle, display_name, instance, mode, status, last_error, last_synced_at)
        values (${id}, ${userId}, ${platform}, ${handle}, ${handle}, '', 'public', 'active', '', now())
      `;
      await insertRemote(sql, userId, id, platform, pulled.posts);
      imported = true;
    } else lastError = pulled.error;
  } else if (source === "public" && platform === "mastodon") {
    const pulled = await pullMastodon(instance, handle);
    if (pulled.ok) {
      mode = "public";
      await sql`
        insert into connections (id, user_id, platform, handle, display_name, instance, mode, status, last_error, last_synced_at)
        values (${id}, ${userId}, ${platform}, ${handle}, ${handle}, ${publicHost(instance) ?? ""}, 'public', 'active', '', now())
      `;
      await insertRemote(sql, userId, id, platform, pulled.posts);
      imported = true;
    } else lastError = pulled.error;
  } else if (source === "public") {
    lastError = PLATFORMS[platform].wait;
  }
  if (!imported) {
    await sql`
      insert into connections (id, user_id, platform, handle, display_name, instance, mode, status, last_error, last_synced_at)
      values (
        ${id}, ${userId}, ${platform}, ${handle}, ${handle}, ${instance}, 'demo', 'active', ${lastError}, now()
      )
    `;
    await insertSeed(sql, userId, id, platform, profile.handle);
    mode = "demo";
  }
  return { ok: true as const, mode, lastError };
}

export const connectPlatform = createServerFn({ method: "POST" })
  .validator((input: { platform?: string; handle?: string; instance?: string; source?: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const platform = String(data.platform ?? "");
    if (!isPlatform(platform)) return { ok: false as const, error: "Unknown network." };
    const handle = cleanText(data.handle, 80).replace(/^@/, "");
    if (!/^[A-Za-z0-9._-]{2,80}$/.test(handle)) {
      return { ok: false as const, error: "Handle should be letters, numbers, dots, or dashes." };
    }
    const source = data.source === "public" ? "public" : "studio";
    const instance = cleanText(data.instance, 120);
    if (source === "public" && platform === "mastodon" && !publicHost(instance)) {
      return { ok: false as const, error: "Mastodon needs a public https instance." };
    }
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    return connectOne(sql, context.userId, profile, platform, handle, instance, source);
  });

export const openStudio = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const notes: string[] = [];
    for (const platform of PLATFORM_IDS) {
      const result = await connectOne(
        sql,
        context.userId,
        profile,
        platform,
        studioHandle(platform),
        studioInstance(platform),
        "studio",
      );
      if (!result.ok) notes.push(result.error);
    }
    return { ok: true as const, notes };
  });

export const disconnectPlatform = createServerFn({ method: "POST" })
  .validator((input: { id?: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const id = cleanText(data.id, 80);
    const sql = await getSql();
    await sql`delete from feed_posts where user_id = ${context.userId} and connection_id = ${id} and is_own = false`;
    await sql`delete from connections where user_id = ${context.userId} and id = ${id}`;
    return { ok: true as const };
  });

export const resyncPlatform = createServerFn({ method: "POST" })
  .validator((input: { id?: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const id = cleanText(data.id, 80);
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const rows = await sql<Record<string, unknown>>`
      select id, platform, handle, instance, mode from connections where user_id = ${context.userId} and id = ${id}
    `;
    const row = rows[0];
    if (!row || !isPlatform(String(row.platform))) return { ok: false as const, error: "Connection not found." };
    const platform = String(row.platform) as PlatformId;
    await sql`delete from feed_posts where user_id = ${context.userId} and connection_id = ${id} and is_own = false`;
    if (row.mode === "public" && platform === "bluesky") {
      const pulled = await pullBluesky(String(row.handle));
      if (pulled.ok) {
        await insertRemote(sql, context.userId, id, platform, pulled.posts);
        await sql`update connections set last_error = '', last_synced_at = now(), status = 'active' where id = ${id}`;
        return { ok: true as const };
      }
      await insertSeed(sql, context.userId, id, platform, profile.handle);
      await sql`update connections set mode = 'demo', last_error = ${pulled.error}, last_synced_at = now() where id = ${id}`;
      return { ok: true as const, warning: pulled.error };
    }
    if (row.mode === "public" && platform === "mastodon") {
      const pulled = await pullMastodon(String(row.instance), String(row.handle));
      if (pulled.ok) {
        await insertRemote(sql, context.userId, id, platform, pulled.posts);
        await sql`update connections set last_error = '', last_synced_at = now(), status = 'active' where id = ${id}`;
        return { ok: true as const };
      }
      await insertSeed(sql, context.userId, id, platform, profile.handle);
      await sql`update connections set mode = 'demo', last_error = ${pulled.error}, last_synced_at = now() where id = ${id}`;
      return { ok: true as const, warning: pulled.error };
    }
    await insertSeed(sql, context.userId, id, platform, profile.handle);
    await sql`update connections set last_synced_at = now(), status = 'active' where id = ${id}`;
    return { ok: true as const };
  });

export const listFeed = createServerFn({ method: "POST" })
  .validator(
    (input: { platform?: string; search?: string; bookmarked?: boolean; cursor?: string | null }) =>
      input ?? {},
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const platform = data.platform && isPlatform(data.platform) ? data.platform : "";
    const search = cleanText(data.search, 80).replace(/[\\%_]/g, (m) => `\\${m}`);
    const bookmarked = Boolean(data.bookmarked);
    let cursorAt: string | null = null;
    let cursorId: string | null = null;
    if (data.cursor) {
      const [at, id] = String(data.cursor).split("|");
      if (at && id) {
        cursorAt = at;
        cursorId = id;
      }
    }
    const rows = await sql.query<Record<string, unknown>>(
      `select * from feed_posts
       where user_id = $1 and reply_to is null
         and ($2 = '' or platform = $2)
         and ($3 = false or bookmarked = true)
         and ($4 = '' or content ilike '%' || $4 || '%' escape '\\' or author_handle ilike '%' || $4 || '%' escape '\\' or author_name ilike '%' || $4 || '%' escape '\\')
         and ($5::timestamptz is null or posted_at < $5::timestamptz or (posted_at = $5::timestamptz and id < $6))
       order by posted_at desc, id desc
       limit 12`,
      [context.userId, platform, bookmarked, search, cursorAt, cursorId],
    );
    const posts = rows.map(mapPost);
    const last = posts[posts.length - 1];
    return {
      posts,
      next: posts.length === 12 && last ? `${last.postedAt}|${last.id}` : null,
    };
  });

export const getThread = createServerFn({ method: "POST" })
  .validator((input: { id?: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const id = cleanText(data.id, 80);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from feed_posts
      where user_id = ${context.userId} and (id = ${id} or reply_to = ${id})
      order by posted_at asc
    `;
    return { posts: rows.map(mapPost) };
  });

async function toggle(column: "liked" | "bookmarked" | "reposted", count: "like_count" | "repost_count" | null, id: string, userId: string) {
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select id, liked, bookmarked, reposted, like_count, repost_count from feed_posts
    where id = ${id} and user_id = ${userId}
  `;
  const row = rows[0];
  if (!row) return { ok: false as const, error: "Post not found." };
  const next = !row[column];
  if (column === "liked") {
    const n = Math.max(0, Number(row.like_count) + (next ? 1 : -1));
    await sql`update feed_posts set liked = ${next}, like_count = ${n} where id = ${id} and user_id = ${userId}`;
  } else if (column === "reposted") {
    const n = Math.max(0, Number(row.repost_count) + (next ? 1 : -1));
    await sql`update feed_posts set reposted = ${next}, repost_count = ${n} where id = ${id} and user_id = ${userId}`;
  } else {
    await sql`update feed_posts set bookmarked = ${next} where id = ${id} and user_id = ${userId}`;
  }
  void count;
  return { ok: true as const, on: next };
}

export const toggleLike = createServerFn({ method: "POST" })
  .validator((input: { id?: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => toggle("liked", "like_count", cleanText(data.id, 80), context.userId));

export const toggleBookmark = createServerFn({ method: "POST" })
  .validator((input: { id?: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => toggle("bookmarked", null, cleanText(data.id, 80), context.userId));

export const toggleRepost = createServerFn({ method: "POST" })
  .validator((input: { id?: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => toggle("reposted", "repost_count", cleanText(data.id, 80), context.userId));

export const replyToPost = createServerFn({ method: "POST" })
  .validator((input: { id?: string; content?: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const id = cleanText(data.id, 80);
    const content = cleanText(data.content, 2000);
    if (!content) return { ok: false as const, error: "Write a reply first." };
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const parents = await sql<Record<string, unknown>>`
      select id, platform from feed_posts where id = ${id} and user_id = ${context.userId}
    `;
    const parent = parents[0];
    if (!parent || !isPlatform(String(parent.platform))) return { ok: false as const, error: "Post not found." };
    const platform = String(parent.platform) as PlatformId;
    if (overLimit(platform, content)) {
      return { ok: false as const, error: `Reply is over the ${PLATFORMS[platform].limit} limit.` };
    }
    await sql`
      insert into feed_posts (
        id, user_id, platform, external_id, author_handle, author_name, content, is_own, reply_to, posted_at
      ) values (
        ${crypto.randomUUID()}, ${context.userId}, ${platform}, ${`reply:${crypto.randomUUID()}`},
        ${profile.handle}, ${profile.displayName}, ${content}, true, ${id}, ${new Date().toISOString()}
      )
    `;
    await sql`update feed_posts set reply_count = reply_count + 1 where id = ${id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const publishPost = createServerFn({ method: "POST" })
  .validator(
    (input: {
      content?: string;
      platforms?: string[];
      variants?: Record<string, string>;
      scheduledAt?: string | null;
      idempotencyKey?: string;
    }) => input,
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const content = cleanText(data.content, 5000);
    const platforms = [...new Set((data.platforms ?? []).filter(isPlatform))];
    if (!content) return { ok: false as const, error: "Write something first." };
    if (!platforms.length) return { ok: false as const, error: "Pick at least one network." };
    const variants: Record<string, string> = {};
    for (const platform of platforms) {
      const custom = cleanText(data.variants?.[platform], 5000);
      if (custom) variants[platform] = custom;
    }
    const limits = platforms
      .map((platform) => {
        const text = variants[platform] || content;
        return { platform, length: text.length, limit: PLATFORMS[platform].limit, over: overLimit(platform, text) };
      })
      .filter((item) => item.over);
    if (limits.length) {
      return {
        ok: false as const,
        error: limits.map((item) => `${PLATFORMS[item.platform].name} is ${item.length - item.limit} over.`).join(" "),
      };
    }
    const key = cleanText(data.idempotencyKey, 80);
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    if (key) {
      const prior = await sql<{ id: string }>`
        select id from publish_jobs where user_id = ${context.userId} and idempotency_key = ${key}
      `;
      if (prior[0]) {
        const jobs = await loadJobs(sql, context.userId);
        const job = jobs.find((item) => item.id === prior[0].id) ?? null;
        return { ok: true as const, reused: true, job };
      }
    }
    let scheduledAt: string | null = null;
    if (data.scheduledAt) {
      const when = new Date(data.scheduledAt);
      if (Number.isNaN(when.getTime())) return { ok: false as const, error: "That time is not valid." };
      if (when.getTime() > Date.now() + 30_000) scheduledAt = when.toISOString();
    }
    const jobId = crypto.randomUUID();
    try {
      await sql`
        insert into publish_jobs (id, user_id, content, variants, scheduled_at, status, idempotency_key)
        values (
          ${jobId}, ${context.userId}, ${content}, ${JSON.stringify(variants)},
          ${scheduledAt}, ${scheduledAt ? "scheduled" : "pending"}, ${key || null}
        )
      `;
    } catch {
      if (key) {
        const prior = await sql<{ id: string }>`
          select id from publish_jobs where user_id = ${context.userId} and idempotency_key = ${key}
        `;
        if (prior[0]) {
          const jobs = await loadJobs(sql, context.userId);
          return { ok: true as const, reused: true, job: jobs.find((item) => item.id === prior[0].id) ?? null };
        }
      }
      return { ok: false as const, error: "Could not open a publish job." };
    }
    for (const platform of platforms) {
      await sql`
        insert into publish_targets (id, job_id, user_id, platform, status)
        values (${crypto.randomUUID()}, ${jobId}, ${context.userId}, ${platform}, 'pending')
      `;
    }
    if (!scheduledAt) await deliverJob(sql, context.userId, jobId, profile);
    const jobs = await loadJobs(sql, context.userId);
    return { ok: true as const, reused: false, job: jobs.find((item) => item.id === jobId) ?? null };
  });

export const listHistory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    await flushDue(sql, context.userId, profile);
    return { jobs: await loadJobs(sql, context.userId) };
  });

export const cancelSchedule = createServerFn({ method: "POST" })
  .validator((input: { id?: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const id = cleanText(data.id, 80);
    const sql = await getSql();
    await sql`
      update publish_jobs set status = 'cancelled'
      where id = ${id} and user_id = ${context.userId} and status = 'scheduled'
    `;
    await sql`
      update publish_targets set status = 'failed', error = 'Cancelled'
      where job_id = ${id} and user_id = ${context.userId} and status = 'pending'
    `;
    return { ok: true as const };
  });

export const listDrafts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select id, content, platforms, updated_at from drafts
      where user_id = ${context.userId} order by updated_at desc limit 20
    `;
    return {
      drafts: rows.map((row) => ({
        id: String(row.id),
        content: String(row.content),
        platforms: String(row.platforms ?? "")
          .split(",")
          .filter(isPlatform),
        updatedAt: iso(row.updated_at),
      })),
    };
  });

export const saveDraft = createServerFn({ method: "POST" })
  .validator((input: { id?: string; content?: string; platforms?: string[] }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const content = cleanText(data.content, 5000);
    if (!content) return { ok: false as const, error: "Nothing to save." };
    const platforms = (data.platforms ?? []).filter(isPlatform).join(",");
    const sql = await getSql();
    const id = cleanText(data.id, 80) || crypto.randomUUID();
    await sql`
      insert into drafts (id, user_id, content, platforms, updated_at)
      values (${id}, ${context.userId}, ${content}, ${platforms}, now())
      on conflict (id) do update set content = ${content}, platforms = ${platforms}, updated_at = now()
      where drafts.user_id = ${context.userId}
    `;
    return { ok: true as const, id };
  });

export const deleteDraft = createServerFn({ method: "POST" })
  .validator((input: { id?: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from drafts where id = ${cleanText(data.id, 80)} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const listLenses = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select id, name, platform, query, bookmarks_only from lenses
      where user_id = ${context.userId} order by created_at desc
    `;
    return {
      lenses: rows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        platform: isPlatform(String(row.platform)) ? (String(row.platform) as PlatformId) : "",
        query: String(row.query ?? ""),
        bookmarksOnly: Boolean(row.bookmarks_only),
      })),
    };
  });

export const saveLens = createServerFn({ method: "POST" })
  .validator((input: { name?: string; platform?: string; query?: string; bookmarksOnly?: boolean }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const name = cleanText(data.name, 40);
    if (!name) return { ok: false as const, error: "Name the lens." };
    const platform = data.platform && isPlatform(data.platform) ? data.platform : "";
    const sql = await getSql();
    await sql`
      insert into lenses (id, user_id, name, platform, query, bookmarks_only)
      values (${crypto.randomUUID()}, ${context.userId}, ${name}, ${platform}, ${cleanText(data.query, 80)}, ${Boolean(data.bookmarksOnly)})
    `;
    return { ok: true as const };
  });

export const deleteLens = createServerFn({ method: "POST" })
  .validator((input: { id?: string }) => input)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from lenses where id = ${cleanText(data.id, 80)} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const listInbox = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const profile = await ensureProfile(sql, context.userId);
    const rows = await sql<Record<string, unknown>>`
      select * from feed_posts
      where user_id = ${context.userId} and is_own = false and content ilike ${`%@${profile.handle}%`}
      order by posted_at desc limit 40
    `;
    return { handle: profile.handle, posts: rows.map(mapPost) };
  });

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const byDay = await sql<{ day: string; posts: number }>`
      select to_char(posted_at, 'MM-DD') as day, count(*) as posts
      from feed_posts
      where user_id = ${context.userId} and posted_at > now() - interval '14 days'
      group by 1, date_trunc('day', posted_at)
      order by date_trunc('day', posted_at)
    `;
    const byPlatform = await sql<Record<string, unknown>>`
      select platform,
        count(*) filter (where status = 'success') as ok,
        count(*) filter (where status = 'failed') as bad,
        coalesce(avg(latency_ms) filter (where status = 'success'), 0) as latency
      from publish_targets
      where user_id = ${context.userId}
      group by platform
    `;
    const volume = await sql<Record<string, unknown>>`
      select platform, count(*) as posts from feed_posts
      where user_id = ${context.userId} and reply_to is null
      group by platform
    `;
    const totals = await sql<{ sent: number; failed: number }>`
      select
        count(*) filter (where status = 'success') as sent,
        count(*) filter (where status = 'failed') as failed
      from publish_targets where user_id = ${context.userId}
    `;
    return {
      byDay: byDay.map((row) => ({ day: String(row.day), posts: Number(row.posts) })),
      byPlatform: byPlatform.filter((row) => isPlatform(String(row.platform))).map((row) => ({
        platform: String(row.platform) as PlatformId,
        ok: Number(row.ok ?? 0),
        bad: Number(row.bad ?? 0),
        latency: Math.round(Number(row.latency ?? 0)),
      })),
      volume: volume.filter((row) => isPlatform(String(row.platform))).map((row) => ({
        platform: String(row.platform) as PlatformId,
        posts: Number(row.posts ?? 0),
      })),
      sent: Number(totals[0]?.sent ?? 0),
      failed: Number(totals[0]?.failed ?? 0),
    };
  });

export const assistCopy = createServerFn({ method: "POST" })
  .validator((input: { text?: string; mode?: string; limit?: number }) => input)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const text = cleanText(data.text, 4000);
    if (!text) return { ok: false as const, error: "Write a draft first." };
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Writing assist is not available right now." };
    const limit = Math.min(2200, Math.max(80, Number(data.limit) || 280));
    const mode = data.mode === "warmer" || data.mode === "thread" || data.mode === "alt" ? data.mode : "tighten";
    const instruction =
      mode === "warmer"
        ? `Rewrite warmer and more specific, still under ${limit} characters. Return only the rewrite.`
        : mode === "thread"
          ? `Split into 3 posts, each under ${limit} characters. Return JSON: {"posts":["...","...","..."]} and nothing else.`
          : mode === "alt"
            ? "Write one sentence of alt text for the image this caption describes. Return only that sentence."
            : `Cut to the tightest true version under ${limit} characters. Do not add hashtags. Return only the rewrite.`;
    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "grok-4.5",
          max_tokens: 400,
          temperature: 0.4,
          messages: [
            { role: "system", content: "You edit social copy. No preamble." },
            { role: "user", content: `${instruction}\n\n${text}` },
          ],
        }),
      });
      if (!res.ok) return { ok: false as const, error: "The editor could not answer. Try again." };
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = body.choices?.[0]?.message?.content?.trim() ?? "";
      if (!raw) return { ok: false as const, error: "Empty edit." };
      if (mode === "thread") {
        const match = raw.match(/\{[\s\S]*\}/);
        try {
          const parsed = JSON.parse(match?.[0] ?? raw) as { posts?: string[] };
          const posts = (parsed.posts ?? []).map((p) => cleanText(p, limit)).filter(Boolean).slice(0, 3);
          if (posts.length) return { ok: true as const, mode, posts };
        } catch {
          /* fall through */
        }
      }
      return { ok: true as const, mode, text: cleanText(raw, mode === "alt" ? 300 : limit) };
    } catch {
      return { ok: false as const, error: "The editor could not be reached." };
    }
  });
