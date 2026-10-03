import { PLATFORMS, type PlatformId } from "./platforms";

export type SeedPost = {
  key: string;
  authorName: string;
  authorHandle: string;
  content: string;
  minutesAgo: number;
  likes: number;
  reposts: number;
  replies: number;
  media: string[];
  bookmarked?: boolean;
  liked?: boolean;
  thread?: { key: string; authorName: string; authorHandle: string; content: string; minutesAgo: number }[];
};

const YOU = "{{you}}";

const CORPUS: Record<PlatformId, SeedPost[]> = {
  twitter: [
    {
      key: "inbox",
      authorName: "Mina Park",
      authorHandle: "mina",
      content: `${YOU} the third beat only survives on the long networks. Cut it before you send the X cut.`,
      minutesAgo: 18,
      likes: 42,
      reposts: 6,
      replies: 3,
      media: [],
      thread: [
        {
          key: "inbox-r",
          authorName: "City Desk",
          authorHandle: "citydesk",
          content: "Noted. The X cut loses the stair joke and keeps the kiln line.",
          minutesAgo: 11,
        },
      ],
    },
    {
      key: "limits",
      authorName: "Harbor Notes",
      authorHandle: "harbor",
      content:
        "Character limits are a material, not an error. Write the short one first. The long one is a different sentence, not a padded one.",
      minutesAgo: 54,
      likes: 128,
      reposts: 19,
      replies: 4,
      media: [],
      bookmarked: true,
    },
    {
      key: "rain",
      authorName: "Late Edition",
      authorHandle: "lateedition",
      content: "Rain on Market Street. The train is late. That was the whole post. The rest was padding.",
      minutesAgo: 140,
      likes: 86,
      reposts: 11,
      replies: 2,
      media: ["nx:ink:Market Street"],
    },
    {
      key: "ledger",
      authorName: "Kiln Studio",
      authorHandle: "kiln",
      content:
        "Cross-posted the kiln notes. Four networks took them. One failed on length. The ledger kept the failure instead of pretending it was atomic.",
      minutesAgo: 390,
      likes: 64,
      reposts: 8,
      replies: 1,
      media: [],
      liked: true,
    },
  ],
  threads: [
    {
      key: "quiet",
      authorName: "Mina Park",
      authorHandle: "mina",
      content:
        "Threads gets the warmer cut. Same fact, less armor. If a sentence sounds like a press release, it does not belong here.",
      minutesAgo: 26,
      likes: 210,
      reposts: 14,
      replies: 9,
      media: [],
    },
    {
      key: "studio",
      authorName: "Kiln Studio",
      authorHandle: "kiln",
      content: `${YOU} we left the door open after the firing. Come by before the light goes flat — the copper glaze only reads in the late hour.`,
      minutesAgo: 96,
      likes: 340,
      reposts: 22,
      replies: 17,
      media: ["nx:copper:Kiln 04"],
    },
    {
      key: "walk",
      authorName: "Harbor Notes",
      authorHandle: "harbor",
      content:
        "Walked the waterfront without photographing it. The post is the decision not to. Some networks do not need proof.",
      minutesAgo: 260,
      likes: 155,
      reposts: 9,
      replies: 6,
      media: ["nx:moss:Pier 27"],
    },
    {
      key: "queue",
      authorName: "Late Edition",
      authorHandle: "lateedition",
      content:
        "Scheduled the night note for 9:40, when the desk is quiet and the mentions are not. A queue is just honesty about when you are actually free.",
      minutesAgo: 620,
      likes: 98,
      reposts: 7,
      replies: 2,
      media: [],
    },
  ],
  bluesky: [
    {
      key: "protocol",
      authorName: "Paper Route",
      authorHandle: "paper.route",
      content:
        "Public timelines should not require a developer lawsuit. Read what is already public. Post when you have a password. Do not fake the rest.",
      minutesAgo: 33,
      likes: 76,
      reposts: 21,
      replies: 5,
      media: [],
    },
    {
      key: "you",
      authorName: "Kiln Studio",
      authorHandle: "kiln.studio",
      content: `${YOU} the AT cut is 300. The sentence you love is 318. Lose the adjective, not the noun.`,
      minutesAgo: 77,
      likes: 44,
      reposts: 4,
      replies: 2,
      media: [],
      bookmarked: true,
    },
    {
      key: "light",
      authorName: "Harbor Notes",
      authorHandle: "harbor.notes",
      content: "Blue hour over the yard. No caption needed, so this one is short on purpose.",
      minutesAgo: 210,
      likes: 190,
      reposts: 30,
      replies: 8,
      media: ["nx:bsky:Blue hour"],
    },
    {
      key: "fallback",
      authorName: "Paper Route",
      authorHandle: "paper.route",
      content:
        "If the live pull fails, the desk should not go dark. A sample feed is a fallback, not a lie — label it.",
      minutesAgo: 800,
      likes: 61,
      reposts: 12,
      replies: 3,
      media: [],
    },
  ],
  mastodon: [
    {
      key: "instance",
      authorName: "Ada Voss",
      authorHandle: "ada",
      content:
        "Bring your own instance. The desk should ask for the host, not assume one corporation's. Federation is a form field, not a slogan.",
      minutesAgo: 41,
      likes: 58,
      reposts: 16,
      replies: 7,
      media: [],
    },
    {
      key: "mention",
      authorName: "City Desk",
      authorHandle: "citydesk",
      content: `${YOU} boosted your night note. The thread under it is kinder than the quote posts elsewhere.`,
      minutesAgo: 150,
      likes: 23,
      reposts: 9,
      replies: 4,
      media: [],
    },
    {
      key: "poster",
      authorName: "Reel Room",
      authorHandle: "reelroom",
      content:
        "Video stays on the instance. The desk keeps a poster and the fact of it, not a fake player pretending the file is local.",
      minutesAgo: 300,
      likes: 40,
      reposts: 5,
      replies: 1,
      media: ["nx:video:Night firing"],
    },
    {
      key: "mod",
      authorName: "Ada Voss",
      authorHandle: "ada",
      content:
        "Five hundred characters is enough for a complete thought and not enough for a manifesto. That is the correct constraint.",
      minutesAgo: 1100,
      likes: 112,
      reposts: 18,
      replies: 6,
      media: [],
      liked: true,
    },
  ],
  instagram: [
    {
      key: "caption",
      authorName: "Kiln Studio",
      authorHandle: "kiln",
      content:
        "Kiln 04, copper glaze, late light.\n\nWe fired twelve bowls and kept three. The caption can be long here — say what the clay did, who held the door, why the photo is cropped tight. Other networks get one line. This one gets the room.\n\nOpen Saturday. No tickets, just come before the light drops.",
      minutesAgo: 48,
      likes: 1204,
      reposts: 0,
      replies: 36,
      media: ["nx:copper:Kiln 04", "nx:bone:Bowl 2"],
    },
    {
      key: "you",
      authorName: "Harbor Notes",
      authorHandle: "harbor",
      content: `${YOU} this frame is yours if you want it for the desk story. Credit the pier, not me.`,
      minutesAgo: 180,
      likes: 640,
      reposts: 0,
      replies: 12,
      media: ["nx:moss:Pier 27"],
    },
    {
      key: "grid",
      authorName: "Late Edition",
      authorHandle: "lateedition",
      content:
        "Four frames from the same hour: steam, hands, the ticket window, the empty seat. A grid is a sentence if you order it.",
      minutesAgo: 540,
      likes: 890,
      reposts: 0,
      replies: 20,
      media: ["nx:ink:Steam", "nx:copper:Hands", "nx:bone:Window", "nx:moss:Seat"],
    },
    {
      key: "alt",
      authorName: "Mina Park",
      authorHandle: "mina",
      content:
        "Alt text is part of the post, not a chore after it. If you cannot say what is in the frame, you do not have a caption yet.",
      minutesAgo: 1500,
      likes: 2100,
      reposts: 0,
      replies: 44,
      media: [],
      bookmarked: true,
    },
  ],
};

export function studioHandle(platform: PlatformId): string {
  if (platform === "bluesky") return "citydesk.bsky.social";
  if (platform === "mastodon") return "citydesk";
  return "citydesk";
}

export function studioInstance(platform: PlatformId): string {
  return platform === "mastodon" ? "social.example" : "";
}

export function buildTimeline(platform: PlatformId, mention: string): SeedPost[] {
  const you = mention ? `@${mention.replace(/^@/, "")}` : "@you";
  return CORPUS[platform].map((post) => ({
    ...post,
    content: post.content.replaceAll(YOU, you),
    thread: post.thread?.map((reply) => ({
      ...reply,
      content: reply.content.replaceAll(YOU, you),
    })),
  }));
}

export function overLimit(platform: PlatformId, content: string): boolean {
  return content.length > PLATFORMS[platform].limit;
}
