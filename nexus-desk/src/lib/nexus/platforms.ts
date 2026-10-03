export const PLATFORM_IDS = [
  "twitter",
  "threads",
  "bluesky",
  "mastodon",
  "instagram",
] as const;

export type PlatformId = (typeof PLATFORM_IDS)[number];

export type PlatformMeta = {
  id: PlatformId;
  name: string;
  short: string;
  limit: number;
  auth: string;
  /** Public read is possible without a developer app. */
  publicRead: boolean;
  wait: string;
};

export const PLATFORMS: Record<PlatformId, PlatformMeta> = {
  twitter: {
    id: "twitter",
    name: "X",
    short: "X",
    limit: 280,
    auth: "OAuth 2.0",
    publicRead: false,
    wait: "Needs an X developer app. Studio sample stays on until then.",
  },
  threads: {
    id: "threads",
    name: "Threads",
    short: "Th",
    limit: 500,
    auth: "Meta OAuth",
    publicRead: false,
    wait: "Needs a Meta developer app. Studio sample stays on until then.",
  },
  bluesky: {
    id: "bluesky",
    name: "Bluesky",
    short: "Bsky",
    limit: 300,
    auth: "Public read · app password to post",
    publicRead: true,
    wait: "",
  },
  mastodon: {
    id: "mastodon",
    name: "Mastodon",
    short: "Mast",
    limit: 500,
    auth: "Public read · OAuth to post",
    publicRead: true,
    wait: "",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    short: "IG",
    limit: 2200,
    auth: "Meta OAuth",
    publicRead: false,
    wait: "Needs a Meta developer app. Studio sample stays on until then.",
  },
};

export function isPlatform(value: string): value is PlatformId {
  return (PLATFORM_IDS as readonly string[]).includes(value);
}

export function tightestLimit(ids: PlatformId[]): number {
  if (!ids.length) return 500;
  return Math.min(...ids.map((id) => PLATFORMS[id].limit));
}
