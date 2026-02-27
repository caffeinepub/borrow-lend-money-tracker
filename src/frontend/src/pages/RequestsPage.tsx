import { useState, useEffect, useCallback } from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { formatAmount, relativeTime } from "../utils/helpers";
import NewRequestModal from "../components/app/NewRequestModal";
import { toast } from "sonner";
import { Plus, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import type { BorrowLendRequest, UserProfile } from "../backend.d";
import { RequestStatus, RequestType } from "../backend";

type Filter = "all" | "pending" | "active" | "completed";

function StatusBadge({ status }: { status: RequestStatus }) {
  const classes: Record<RequestStatus, string> = {
    [RequestStatus.pending]: "bg-amber-50 text-amber-700 border border-amber-200",
    [RequestStatus.accepted]: "bg-primary/10 text-primary border border-primary/20",
    [RequestStatus.completed]: "bg-muted text-muted-foreground border border-border",
    [RequestStatus.rejected]: "bg-destructive/10 text-destructive border border-destructive/20",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${classes[status] ?? ""}`}>
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: RequestType }) {
  const classes =
    type === RequestType.lend ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary";
  const label = type === RequestType.lend ? "LEND" : "BORROW";
  return (
    <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${classes}`}>{label}</span>
  );
}

export default function RequestsPage() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const [requests, setRequests] = useState<BorrowLendRequest[]>([]);
  const [profileCache, setProfileCache] = useState<Record<string, UserProfile>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  const myPrincipal = identity?.getPrincipal().toString();

  const fetchProfiles = useCallback(
    async (reqs: BorrowLendRequest[], currentCache: Record<string, UserProfile>) => {
      if (!actor) return currentCache;
      const principalsToFetch = new Set<string>();
      for (const req of reqs) {
        const from = req.fromPrincipal.toString();
        const to = req.toPrincipal.toString();
        if (!currentCache[from]) principalsToFetch.add(from);
        if (!currentCache[to]) principalsToFetch.add(to);
      }

      const entries = await Promise.all(
        Array.from(principalsToFetch).map(async (p) => {
          try {
            const { Principal } = await import("@dfinity/principal");
            const profile = await actor.getUserProfile(Principal.fromText(p));
            return profile ? ([p, profile] as const) : null;
          } catch {
            return null;
          }
        })
      );

      const newCache = { ...currentCache };
      for (const entry of entries) {
        if (entry) newCache[entry[0]] = entry[1];
      }
      return newCache;
    },
    [actor]
  );

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const result = await actor.getMyRequests();
      const sorted = [...result].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      setRequests(sorted);
      const cache = await fetchProfiles(sorted, {});
      setProfileCache(cache);
    } catch {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [actor, fetchProfiles]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRespond = async (requestId: string, accept: boolean) => {
    if (!actor) return;
    setResponding(requestId);
    try {
      await actor.respondToRequest(requestId, accept);
      toast.success(accept ? "Request accepted!" : "Request rejected");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to respond to request";
      toast.error(msg);
    } finally {
      setResponding(null);
    }
  };

  const handleMarkComplete = async (requestId: string) => {
    if (!actor) return;
    setCompleting(requestId);
    try {
      await actor.markCompleted(requestId);
      toast.success("Marked as completed!");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to mark as complete";
      toast.error(msg);
    } finally {
      setCompleting(null);
    }
  };

  const getFilteredRequests = () => {
    switch (filter) {
      case "pending":
        return requests.filter((r) => r.status === RequestStatus.pending);
      case "active":
        return requests.filter((r) => r.status === RequestStatus.accepted);
      case "completed":
        return requests.filter(
          (r) => r.status === RequestStatus.completed || r.status === RequestStatus.rejected
        );
      default:
        return requests;
    }
  };

  const filtered = getFilteredRequests();

  const getDisplayName = (principal: string) => {
    const p = profileCache[principal];
    if (!p) return principal.slice(0, 10) + "...";
    return p.displayName || principal.slice(0, 10) + "...";
  };

  const pendingCount = requests.filter((r) => r.status === RequestStatus.pending).length;

  const filterLabels: { id: Filter; label: string; count?: number }[] = [
    { id: "all", label: "All", count: requests.length },
    { id: "pending", label: "Pending", count: pendingCount },
    { id: "active", label: "Active" },
    { id: "completed", label: "Done" },
  ];

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Requests</h2>
        <button
          type="button"
          onClick={() => setShowNewRequest(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {filterLabels.map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  filter === id
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-background text-foreground"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <ArrowLeftRight className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">No {filter === "all" ? "" : filter} requests</p>
          {filter === "all" && (
            <button
              type="button"
              onClick={() => setShowNewRequest(true)}
              className="mt-3 text-sm font-medium text-primary hover:opacity-80"
            >
              Create your first request
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((req) => {
            const isFromMe = req.fromPrincipal.toString() === myPrincipal;
            const otherPrincipal = isFromMe
              ? req.toPrincipal.toString()
              : req.fromPrincipal.toString();
            const otherName = getDisplayName(otherPrincipal);
            const isResponding = responding === req.id;
            const isCompleting = completing === req.id;

            // Can respond: we're the recipient and it's pending
            const canRespond = !isFromMe && req.status === RequestStatus.pending;
            // Can mark complete: we're the sender and it's accepted
            const canMarkComplete = isFromMe && req.status === RequestStatus.accepted;

            return (
              <div
                key={req.id}
                className={`rounded-xl bg-card border p-4 shadow-xs fade-in ${
                  req.status === RequestStatus.pending && canRespond
                    ? "border-amber-200"
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <TypeBadge type={req.requestType} />
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-base font-bold text-foreground whitespace-nowrap font-mono-nums">
                    {formatAmount(req.amount)}
                  </p>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium">{isFromMe ? "To:" : "From:"}</span> {otherName}
                </p>

                {req.description && (
                  <p className="mt-1 text-xs text-muted-foreground italic line-clamp-2">
                    &ldquo;{req.description}&rdquo;
                  </p>
                )}

                <p className="mt-1 text-xs text-muted-foreground/70">{relativeTime(req.createdAt)}</p>

                {canRespond && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRespond(req.id, false)}
                      disabled={isResponding}
                      className="flex-1 rounded-lg border border-destructive/30 bg-destructive/10 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                    >
                      {isResponding ? (
                        <div className="mx-auto h-3 w-3 animate-spin rounded-full border border-destructive border-t-transparent" />
                      ) : (
                        "Reject"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespond(req.id, true)}
                      disabled={isResponding}
                      className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {isResponding ? (
                        <div className="mx-auto h-3 w-3 animate-spin rounded-full border border-primary-foreground border-t-transparent" />
                      ) : (
                        "Accept"
                      )}
                    </button>
                  </div>
                )}

                {canMarkComplete && (
                  <button
                    type="button"
                    onClick={() => handleMarkComplete(req.id)}
                    disabled={isCompleting}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-muted border border-border py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    {isCompleting ? (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark as Complete
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
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
