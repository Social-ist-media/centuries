import { useEffect, useState } from "react";
import { toast } from "sonner";
import { updateProfile } from "@/lib/nexus/server";
import { useDesk } from "./desk-context";

export function SettingsView() {
  const { desk, refresh } = useDesk();
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [theme, setTheme] = useState<"paper" | "ink">("paper");

  useEffect(() => {
    if (!desk) return;
    setDisplayName(desk.profile.displayName);
    setHandle(desk.profile.handle);
    setBio(desk.profile.bio);
    setTheme(desk.profile.theme);
  }, [desk]);

  return (
    <form
      className="max-w-xl rounded-2xl border border-line bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void updateProfile({ data: { displayName, handle, bio, theme } }).then(async (res) => {
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          document.documentElement.dataset.theme = theme;
          localStorage.setItem("nx-theme", theme);
          toast.success("Saved");
          await refresh();
        });
      }}
    >
      <h1 className="font-display text-3xl">The desk</h1>
      <p className="mt-2 text-sm text-muted">{desk?.profile.email}</p>
      <label className="mt-4 block text-sm">
        Name
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-bg px-3" />
      </label>
      <label className="mt-3 block text-sm">
        Handle
        <input value={handle} onChange={(e) => setHandle(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-bg px-3" />
      </label>
      <label className="mt-3 block text-sm">
        Bio
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-line bg-bg p-3" />
      </label>
      <fieldset className="mt-4">
        <legend className="text-sm">Paper</legend>
        <div className="mt-2 flex gap-2">
          <ThemeButton current={theme} value="paper" onPick={setTheme} label="Day" />
          <ThemeButton current={theme} value="ink" onPick={setTheme} label="Night" />
        </div>
      </fieldset>
      <button type="submit" className="mt-5 min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-accent-fg">
        Save
      </button>
    </form>
  );
}

function ThemeButton({
  current,
  value,
  label,
  onPick,
}: {
  current: "paper" | "ink";
  value: "paper" | "ink";
  label: string;
  onPick: (value: "paper" | "ink") => void;
}) {
  const on = current === value;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        onPick(value);
        document.documentElement.dataset.theme = value;
      }}
      className={`min-h-11 rounded-full border px-4 text-sm ${on ? "border-fg bg-fg text-bg" : "border-line"}`}
    >
      {label}
    </button>
  );
}
