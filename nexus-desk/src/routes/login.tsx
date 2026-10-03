import { createFileRoute, Navigate, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Mark } from "@/components/nexus/glyphs";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isPending) return <main className="grid min-h-dvh place-items-center text-sm text-muted">Checking the desk…</main>;
  if (user) return <Navigate to="/desk" search={{ view: "feed" }} />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result =
        mode === "up"
          ? await authClient.signUp.email({ email, password, name, callbackURL: "/desk" })
          : await authClient.signIn.email({ email, password, callbackURL: "/desk" });
      if (result.error) {
        setError(result.error.message ?? "That did not work.");
        return;
      }
      await router.invalidate();
      await router.navigate({ to: "/desk", search: { view: "feed" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10 text-fg">
      <div className="w-full max-w-md">
        <a href="/" className="mb-8 flex items-center gap-2 font-display text-2xl">
          <Mark />
          NEXUS
        </a>
        <h1 className="font-display text-4xl">{mode === "up" ? "Open a desk" : "Welcome back"}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Email stays on this desk. Google and X use the same sign-in you already trust.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "up" ? (
            <label className="block text-sm">
              Name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-surface px-3"
              />
            </label>
          ) : null}
          <label className="block text-sm">
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-surface px-3"
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-surface px-3"
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button type="submit" disabled={busy} className="min-h-11 w-full rounded-full bg-accent text-sm font-medium text-accent-fg disabled:opacity-50">
            {mode === "up" ? "Create the desk" : "Enter"}
          </button>
        </form>
        <button type="button" className="mt-3 text-sm text-muted" onClick={() => setMode(mode === "up" ? "in" : "up")}>
          {mode === "up" ? "Already have a desk? Sign in" : "Need a desk? Create one"}
        </button>
        <div className="my-6 h-px bg-line" />
        <div className="space-y-2">
          {GROK_PROVIDERS.map((provider) => (
            <button
              key={provider.providerId}
              type="button"
              onClick={() => signIn(provider.providerId, { callbackURL: "/desk" })}
              className="min-h-11 w-full rounded-full border border-line bg-surface text-sm font-medium"
            >
              Continue with {provider.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
