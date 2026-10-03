import { useState } from "react";
import { toast } from "sonner";
import { connectPlatform, disconnectPlatform, openStudio, resyncPlatform } from "@/lib/nexus/server";
import { PLATFORM_IDS, PLATFORMS, type PlatformId } from "@/lib/nexus/platforms";
import { useDesk } from "./desk-context";
import { PlatformGlyph } from "./glyphs";

export function ConnectionsView() {
  const { desk, refresh } = useDesk();
  const [platform, setPlatform] = useState<PlatformId>("bluesky");
  const [handle, setHandle] = useState("");
  const [instance, setInstance] = useState("mastodon.social");
  const [source, setSource] = useState<"studio" | "public">("studio");
  const [busy, setBusy] = useState(false);
  const meta = PLATFORMS[platform];

  async function studio() {
    setBusy(true);
    try {
      const res = await openStudio();
      if (res.notes.length) toast.message(res.notes[0]);
      else toast.success("Studio networks are on the desk");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open the studio");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h1 className="font-display text-3xl">Networks</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          X, Threads, and Instagram still wait on developer apps. Until those exist, the studio sample keeps the desk alive. Bluesky and Mastodon can pull a real public timeline — posting to them still needs your own app password or OAuth, which this desk never stores.
        </p>
        <button type="button" disabled={busy} onClick={() => void studio()} className="mt-4 min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-fg disabled:opacity-50">
          Open the studio
        </button>
      </section>
      <form
        className="rounded-2xl border border-line bg-surface p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          void connectPlatform({ data: { platform, handle, instance, source } })
            .then(async (res) => {
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              if (res.lastError) toast.message(res.lastError);
              else toast.success(res.mode === "public" ? "Public timeline pulled" : "Sample timeline loaded");
              setHandle("");
              await refresh();
            })
            .finally(() => setBusy(false));
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Network
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PlatformId)}
              className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-bg px-3"
            >
              {PLATFORM_IDS.map((id) => (
                <option key={id} value={id}>
                  {PLATFORMS[id].name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Handle
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              required
              placeholder="citydesk"
              className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-bg px-3"
            />
          </label>
          {platform === "mastodon" ? (
            <label className="text-sm sm:col-span-2">
              Instance
              <input
                value={instance}
                onChange={(e) => setInstance(e.target.value)}
                placeholder="mastodon.social"
                className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-bg px-3"
              />
            </label>
          ) : null}
        </div>
        <fieldset className="mt-4 flex flex-wrap gap-4 text-sm">
          <label className="inline-flex min-h-11 items-center gap-2">
            <input type="radio" name="source" checked={source === "studio"} onChange={() => setSource("studio")} />
            Studio sample
          </label>
          <label className="inline-flex min-h-11 items-center gap-2">
            <input
              type="radio"
              name="source"
              checked={source === "public"}
              onChange={() => setSource("public")}
              disabled={!meta.publicRead}
            />
            Public timeline
          </label>
        </fieldset>
        <p className="mt-2 text-sm text-muted">{meta.publicRead ? meta.auth : meta.wait}</p>
        <button type="submit" disabled={busy} className="mt-4 min-h-11 rounded-full bg-fg px-5 text-sm font-medium text-bg disabled:opacity-50">
          Connect
        </button>
      </form>
      <ul className="space-y-3">
        {desk?.connections.map((connection) => (
          <li key={connection.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4">
            <PlatformGlyph platform={connection.platform} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {PLATFORMS[connection.platform].name} · @{connection.handle}
              </p>
              <p className="text-sm text-muted">
                {connection.mode === "public" ? "Public" : "Studio"} · {connection.instance || "no instance"} ·{" "}
                {connection.lastSyncedAt ? `synced ${new Date(connection.lastSyncedAt).toLocaleString()}` : "not synced"}
              </p>
              {connection.lastError ? <p className="mt-1 text-sm text-danger">{connection.lastError}</p> : null}
            </div>
            <button
              type="button"
              className="min-h-11 rounded-full border border-line px-3 text-sm"
              onClick={() =>
                void resyncPlatform({ data: { id: connection.id } }).then(async (res) => {
                  if (!res.ok) toast.error(res.error);
                  else if ("warning" in res && res.warning) toast.message(res.warning);
                  await refresh();
                })
              }
            >
              Refresh
            </button>
            <button
              type="button"
              className="min-h-11 rounded-full px-3 text-sm text-danger"
              onClick={() => void disconnectPlatform({ data: { id: connection.id } }).then(() => refresh())}
            >
              Disconnect
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
