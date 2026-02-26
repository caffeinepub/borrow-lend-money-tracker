import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { Wallet } from "lucide-react";

export default function LoginPage() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 shadow-lg">
            <Wallet className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Borrow &amp; Lend</h1>
          <p className="mt-2 text-center text-slate-500">
            Track money you borrow and lend
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <span className="text-sm">🔒</span>
              </div>
              <p className="text-sm text-slate-600">Secure on-chain identity</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-green-50 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                <span className="text-sm">📊</span>
              </div>
              <p className="text-sm text-slate-600">Track all your loans in one place</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-purple-50 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <span className="text-sm">🔔</span>
              </div>
              <p className="text-sm text-slate-600">Get notified on every transaction</p>
            </div>
          </div>

          <button
            type="button"
            onClick={login}
            disabled={isLoggingIn}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-60"
          >
            {isLoggingIn ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Sign in with Internet Identity</span>
              </>
            )}
          </button>

          <p className="mt-4 text-center text-xs text-slate-400">
            Powered by Internet Computer
          </p>
        </div>
      </div>
    </div>
  );
}
