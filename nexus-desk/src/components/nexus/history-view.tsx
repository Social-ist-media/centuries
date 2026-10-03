import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cancelSchedule, listHistory } from "@/lib/nexus/server";
import { PLATFORMS, type PlatformId } from "@/lib/nexus/platforms";

type Job = {
  id: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  targets: { platform: PlatformId; status: string; error: string; latencyMs: number }[];
};

export function HistoryView() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await listHistory();
      setJobs(res.jobs);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl">Ledger</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        Every send is a job with a result per network. A failure on one does not erase the others.
      </p>
      {loading ? <p className="mt-6 text-sm text-muted">Reading the ledger…</p> : null}
      {!loading && jobs.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line bg-surface p-6 text-sm text-muted">Nothing published yet.</p>
      ) : null}
      <ul className="mt-6 space-y-3">
        {jobs.map((job) => (
          <li key={job.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="max-w-xl whitespace-pre-wrap text-sm leading-relaxed">{job.content}</p>
              <p className="text-xs text-muted">{job.status}</p>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {job.targets.map((target) => (
                <li
                  key={target.platform}
                  className={`rounded-full px-3 py-1 text-xs ${target.status === "success" ? "bg-ok-soft text-ok" : target.status === "failed" ? "bg-bg text-danger" : "bg-bg text-muted"}`}
                >
                  {PLATFORMS[target.platform].name} · {target.status}
                  {target.error ? ` · ${target.error}` : ""}
                  {target.latencyMs ? ` · ${target.latencyMs}ms` : ""}
                </li>
              ))}
            </ul>
            {job.status === "scheduled" ? (
              <button
                type="button"
                className="mt-3 min-h-11 text-sm text-danger"
                onClick={() =>
                  void cancelSchedule({ data: { id: job.id } }).then(async () => {
                    toast.success("Cancelled");
                    await load();
                  })
                }
              >
                Cancel before it sends
              </button>
            ) : null}
            {job.scheduledAt && job.status === "scheduled" ? (
              <p className="mt-1 text-xs text-muted">Fires {new Date(job.scheduledAt).toLocaleString()}, or the next time you open the desk.</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
