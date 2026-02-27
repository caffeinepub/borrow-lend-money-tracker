import { useState, useEffect, useCallback } from "react";
import { useActor } from "../hooks/useActor";
import { formatAmount, relativeTime } from "../utils/helpers";
import NewRequestModal from "../components/app/NewRequestModal";
import {
  Plus,
  Clock,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowLeftRight,
} from "lucide-react";
import type { BorrowLendRequest, UserProfile } from "../backend.d";
import { RequestStatus, RequestType } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const [summary, setSummary] = useState<{
    pendingCount: bigint;
    totalOwe: number;
    totalOwedToMe: number;
  } | null>(null);
  const [recentRequests, setRecentRequests] = useState<BorrowLendRequest[]>([]);
  const [profileCache, setProfileCache] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);

  const myPrincipal = identity?.getPrincipal().toString();

  const fetchProfile = useCallback(
    async (principal: string, currentCache: Record<string, UserProfile>) => {
      if (currentCache[principal] || !actor) return currentCache;
      try {
        const { Principal } = await import("@dfinity/principal");
        const profile = await actor.getUserProfile(Principal.fromText(principal));
        if (profile) {
          return { ...currentCache, [principal]: profile };
        }
      } catch {
        // silent — profile may not be accessible
      }
      return currentCache;
    },
    [actor]
  );

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const [summaryResult, requestsResult] = await Promise.all([
        actor.getDashboardSummary(),
        actor.getMyRequests(),
      ]);
      setSummary(summaryResult);

      const sorted = [...requestsResult].sort(
        (a, b) => Number(b.createdAt) - Number(a.createdAt)
      );
      const recent = sorted.slice(0, 5);
      setRecentRequests(recent);

      // Fetch profiles for display (sequential to avoid hammering backend)
      let cache: Record<string, UserProfile> = {};
      for (const req of recent) {
        const other =
          req.fromPrincipal.toString() === myPrincipal
            ? req.toPrincipal.toString()
            : req.fromPrincipal.toString();
        cache = await fetchProfile(other, cache);
      }
      setProfileCache(cache);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [actor, myPrincipal, fetchProfile]);

  useEffect(() => {
    load();
  }, [load]);

  const getOtherPrincipal = (req: BorrowLendRequest) => {
    return req.fromPrincipal.toString() === myPrincipal
      ? req.toPrincipal.toString()
      : req.fromPrincipal.toString();
  };

  const getDisplayName = (principal: string) => {
    const p = profileCache[principal];
    if (!p) return principal.slice(0, 10) + "...";
    return p.displayName || principal.slice(0, 10) + "...";
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.pending:
        return "text-amber-600 bg-amber-50 border-amber-200";
      case RequestStatus.accepted:
        return "text-primary bg-primary/10 border-primary/20";
      case RequestStatus.completed:
        return "text-muted-foreground bg-muted border-border";
      case RequestStatus.rejected:
        return "text-destructive bg-destructive/10 border-destructive/20";
      default:
        return "text-muted-foreground bg-muted border-border";
    }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {loading ? (
        <div className="space-y-3">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
          <div className="h-32 animate-pulse rounded-2xl bg-muted" />
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Dashboard</h2>
            <button
              type="button"
              onClick={() => setShowNewRequest(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="h-3.5 w-3.5" />
              New Request
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="borrowed-card-gradient rounded-2xl p-3 text-white shadow-sm">
              <div className="mb-1 flex items-center gap-1">
                <TrendingDown className="h-3 w-3 opacity-80" />
                <p className="text-xs opacity-80">I Owe</p>
              </div>
              <p className="text-sm font-bold leading-tight font-mono-nums">
                {summary ? formatAmount(summary.totalOwe) : "$0.00"}
              </p>
            </div>
            <div className="lent-card-gradient rounded-2xl p-3 text-white shadow-sm">
              <div className="mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 opacity-80" />
                <p className="text-xs opacity-80">Owed to Me</p>
              </div>
              <p className="text-sm font-bold leading-tight font-mono-nums">
                {summary ? formatAmount(summary.totalOwedToMe) : "$0.00"}
              </p>
            </div>
            <div className="balance-card-gradient rounded-2xl p-3 text-white shadow-sm">
              <div className="mb-1 flex items-center gap-1">
                <Wallet className="h-3 w-3 opacity-80" />
                <p className="text-xs opacity-80">Pending</p>
              </div>
              <p className="text-sm font-bold leading-tight">
                {summary ? String(summary.pendingCount) : "0"}
              </p>
            </div>
          </div>

          {/* Pending alert */}
          {summary && Number(summary.pendingCount) > 0 && (
            <button
              type="button"
              onClick={() => onNavigate("requests")}
              className="flex w-full items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-left hover:bg-amber-100 transition-colors"
            >
              <Clock className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm font-medium text-amber-800">
                {Number(summary.pendingCount)} pending request
                {Number(summary.pendingCount) !== 1 ? "s" : ""} awaiting response
              </p>
              <span className="ml-auto text-xs text-amber-600 font-medium">View →</span>
            </button>
          )}

          {/* Recent Requests */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-foreground">Recent Activity</h3>
              <button
                type="button"
                onClick={() => onNavigate("requests")}
                className="text-xs font-medium text-primary hover:opacity-80"
              >
                View all
              </button>
            </div>

            {recentRequests.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <ArrowLeftRight className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm">No requests yet</p>
                <button
                  type="button"
                  onClick={() => setShowNewRequest(true)}
                  className="mt-3 text-sm font-medium text-primary hover:opacity-80"
                >
                  Create your first request
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentRequests.map((req) => {
                  const otherPrincipal = getOtherPrincipal(req);
                  const displayName = getDisplayName(otherPrincipal);
                  const isFromMe = req.fromPrincipal.toString() === myPrincipal;
                  const typeLabel = req.requestType === RequestType.lend ? "LEND" : "BORROW";
                  const typeColor =
                    req.requestType === RequestType.lend
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-primary/10 text-primary";

                  return (
                    <div
                      key={req.id}
                      className="rounded-xl bg-card border border-border p-4 shadow-xs fade-in"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold ${typeColor}`}
                          >
                            {typeLabel}
                          </span>
                          <span className="text-xs text-muted-foreground truncate">
                            {isFromMe ? "to" : "from"} {displayName}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-foreground whitespace-nowrap font-mono-nums">
                          {formatAmount(req.amount)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {req.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {req.description}
                          </p>
                        )}
                        <span
                          className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(req.status)}`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <p className="mt-1 text-right text-xs text-muted-foreground">
                        {relativeTime(req.createdAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => setShowNewRequest(true)}
        className="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity z-30"
        aria-label="New request"
      >
        <Plus className="h-6 w-6" />
      </button>

      <NewRequestModal
        open={showNewRequest}
        onClose={() => setShowNewRequest(false)}
        onSuccess={load}
      />
    </div>
  );
}
