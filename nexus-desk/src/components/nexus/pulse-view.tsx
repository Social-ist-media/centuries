import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAnalytics } from "@/lib/nexus/server";
import { PLATFORMS, type PlatformId } from "@/lib/nexus/platforms";

type Analytics = {
  byDay: { day: string; posts: number }[];
  byPlatform: { platform: PlatformId; ok: number; bad: number; latency: number }[];
  volume: { platform: PlatformId; posts: number }[];
  sent: number;
  failed: number;
};

export function PulseView() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    void getAnalytics().then(setData).catch(() => setData(null));
  }, []);

  const rate = data && data.sent + data.failed > 0 ? Math.round((data.sent / (data.sent + data.failed)) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Pulse</h1>
        <p className="mt-2 text-sm text-muted">Counts from this desk only — posts on the feed, and sends in the ledger.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Successful sends" value={String(data?.sent ?? "—")} />
        <Stat label="Failed sends" value={String(data?.failed ?? "—")} />
        <Stat label="Success rate" value={data ? `${rate}%` : "—"} />
      </div>
      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-sm font-medium">Feed volume, 14 days</h2>
        <div className="mt-4 h-56">
          {data && data.byDay.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byDay}>
                <XAxis dataKey="day" tick={{ fill: "var(--nx-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--nx-muted)", fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  cursor={{ fill: "var(--nx-line)" }}
                  contentStyle={{ background: "var(--nx-surface)", border: "1px solid var(--nx-line)", borderRadius: 12, color: "var(--nx-fg)" }}
                />
                <Bar dataKey="posts" fill="var(--nx-accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted">Volume shows up once the feed has posts.</p>
          )}
        </div>
      </section>
      <section className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Network</th>
              <th className="px-4 py-3 font-medium">On the feed</th>
              <th className="px-4 py-3 font-medium">Sent</th>
              <th className="px-4 py-3 font-medium">Failed</th>
              <th className="px-4 py-3 font-medium">Avg latency</th>
            </tr>
          </thead>
          <tbody>
            {(data?.volume ?? []).map((row) => {
              const send = data?.byPlatform.find((item) => item.platform === row.platform);
              return (
                <tr key={row.platform} className="border-t border-line">
                  <td className="px-4 py-3">{PLATFORMS[row.platform].name}</td>
                  <td className="px-4 py-3">{row.posts}</td>
                  <td className="px-4 py-3">{send?.ok ?? 0}</td>
                  <td className="px-4 py-3">{send?.bad ?? 0}</td>
                  <td className="px-4 py-3">{send?.latency ? `${send.latency} ms` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-2 font-display text-4xl">{value}</p>
    </div>
  );
}
