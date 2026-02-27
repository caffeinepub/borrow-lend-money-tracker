import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { Wallet, ShieldCheck, BarChart3, Bell } from "lucide-react";

export default function LoginPage() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-lg">
            <Wallet className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Borrow &amp; Lend</h1>
          <p className="mt-2 text-center text-muted-foreground">
            Track money you borrow and lend — securely on-chain
          </p>
        </div>

        <div className="rounded-2xl bg-card border border-border p-6 shadow-sm">
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/10 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Secure identity — no password needed</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/10 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Track all your loans in one place</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/10 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Get notified on every activity</p>
            </div>
          </div>

          <button
            type="button"
            onClick={login}
            disabled={isLoggingIn}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-60"
          >
            {isLoggingIn ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              "Sign In"
            )}
          </button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Powered by Internet Computer · Decentralized &amp; Secure
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/50">
          © 2026. Built with ❤️ using{" "}
          <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground transition-colors">
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
