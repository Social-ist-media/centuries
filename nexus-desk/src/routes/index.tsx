import { createFileRoute, Link } from "@tanstack/react-router";
import { SignedIn, SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Mark, PlatformGlyph } from "@/components/nexus/glyphs";
import { PLATFORM_IDS, PLATFORMS } from "@/lib/nexus/platforms";

export const Route = createFileRoute("/")({
  component: Home,
});

const NOTES = [
  {
    title: "One chronology",
    body: "Five networks, newest first. A dead connection does not sink the rest of the hour.",
  },
  {
    title: "A real ledger",
    body: "Each send records success, failure, and how long it took. Partial failure stays partial.",
  },
  {
    title: "Cuts, not clones",
    body: "X is 280. Bluesky is 300. Instagram can hold the room. Write the short one, then tune.",
  },
];

function Home() {
  const { isPending } = useCurrentUserState();
  return (
    <main className="min-h-dvh bg-bg text-fg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 font-display text-2xl">
          <Mark />
          NEXUS
        </div>
        <div className="flex items-center gap-2">
          {isPending ? <span className="h-11 w-28 rounded-full bg-line" /> : null}
          <SignedOut>
            <Link to="/login" className="inline-flex min-h-11 items-center rounded-full bg-fg px-4 text-sm font-medium text-bg">
              Enter
            </Link>
          </SignedOut>
          <SignedIn>
            <Link to="/desk" search={{ view: "feed" }} className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-fg">
              Open the desk
            </Link>
          </SignedIn>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-end gap-10 px-5 pb-16 pt-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Social command desk</p>
          <h1 className="mt-4 max-w-xl font-display text-5xl leading-[1.05] sm:text-6xl">
            Every network.
            <span className="block italic text-accent">One desk.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
            Read X, Threads, Bluesky, Mastodon, and Instagram in a single timeline. Publish with the real character ceilings. Keep a ledger of what actually went out.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <SignedOut>
              <Link to="/login" className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-fg">
                Create your desk
              </Link>
            </SignedOut>
            <SignedIn>
              <Link to="/desk" search={{ view: "connections" }} className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-accent-fg">
                Connect networks
              </Link>
            </SignedIn>
          </div>
          <ul className="mt-8 flex flex-wrap gap-3">
            {PLATFORM_IDS.map((id) => (
              <li key={id} className="flex items-center gap-2 text-sm">
                <PlatformGlyph platform={id} className="size-8" />
                <span>
                  {PLATFORMS[id].name}
                  <span className="block text-xs text-muted">{PLATFORMS[id].limit} chars</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Preview />
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 sm:grid-cols-3">
        {NOTES.map((note) => (
          <article key={note.title} className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-display text-2xl">{note.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{note.body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Network</th>
                <th className="px-4 py-3 font-medium">Ceiling</th>
                <th className="px-4 py-3 font-medium">How you connect</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORM_IDS.map((id) => (
                <tr key={id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium">{PLATFORMS[id].name}</td>
                  <td className="px-4 py-3">{PLATFORMS[id].limit}</td>
                  <td className="px-4 py-3 text-muted">{PLATFORMS[id].publicRead ? PLATFORMS[id].auth : "Studio sample until a developer app exists"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-8 text-sm text-muted">NEXUS keeps credentials off the page. Public reads only. Publishing to live networks waits on your own apps — the desk does not invent them.</p>
      </section>
    </main>
  );
}

function Preview() {
  return (
    <div className="rounded-3xl border border-line bg-surface p-4 shadow-[0_24px_60px_-36px_rgba(28,25,21,0.45)]">
      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <span>Today · chronological</span>
        <span>4 networks</span>
      </div>
      <article className="rounded-2xl bg-bg p-4">
        <div className="flex items-center gap-3">
          <PlatformGlyph platform="bluesky" className="size-8" />
          <div>
            <p className="text-sm font-medium">Paper Route</p>
            <p className="text-xs text-muted">@paper.route · 33m</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed">
          Public timelines should not require a developer lawsuit. Read what is already public. Do not fake the rest.
        </p>
      </article>
      <article className="mt-3 rounded-2xl bg-bg p-4">
        <div className="flex items-center gap-3">
          <PlatformGlyph platform="instagram" className="size-8" />
          <div>
            <p className="text-sm font-medium">Kiln Studio</p>
            <p className="text-xs text-muted">@kiln · 48m</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed">Kiln 04, copper glaze, late light. Other networks get one line. This one gets the room.</p>
        <div className="mt-3 grid grid-cols-2 gap-1">
          <div className="flex aspect-[4/3] items-end rounded-lg bg-accent p-3 text-accent-fg">
            <span className="font-display">Kiln 04</span>
          </div>
          <div className="flex aspect-[4/3] items-end rounded-lg bg-line p-3">
            <span className="font-display">Bowl 2</span>
          </div>
        </div>
      </article>
    </div>
  );
}
