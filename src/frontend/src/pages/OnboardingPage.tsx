import { useState } from "react";
import { useActor } from "../hooks/useActor";
import { parseBackendResult } from "../utils/helpers";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

interface OnboardingPageProps {
  onComplete: () => void;
}

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const { actor } = useActor();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !actor) return;
    setLoading(true);
    try {
      const result = await actor.registerOrUpdateProfile(displayName.trim());
      const parsed = parseBackendResult(result);
      if (parsed.err) {
        toast.error(parsed.err);
      } else {
        onComplete();
      }
    } catch (err) {
      toast.error("Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome!</h1>
          <p className="mt-1 text-slate-500">Let us set up your profile</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="mb-2 block text-sm font-medium text-slate-700"
                htmlFor="displayName"
              >
                Your display name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                maxLength={100}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !displayName.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Get Started"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
