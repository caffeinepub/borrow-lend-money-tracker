import { useState, useEffect, useCallback } from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { formatAmount, relativeTime } from "../utils/helpers";
import { List } from "lucide-react";
import type { Transaction, UserProfile } from "../backend.d";
import { RequestType } from "../backend";

type Filter = "all" | "lend" | "borrow";

export default function TransactionsPage() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profileCache, setProfileCache] = useState<Record<string, UserProfile>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  const myPrincipal = identity?.getPrincipal().toString();

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const result = await actor.getMyTransactions();
      const sorted = [...result].sort((a, b) => Number(b.completedAt) - Number(a.completedAt));
      setTransactions(sorted);

      // Fetch profiles for other parties
      const principalsToFetch = new Set<string>();
      for (const txn of sorted) {
        const from = txn.fromPrincipal.toString();
        const to = txn.toPrincipal.toString();
        if (from !== myPrincipal) principalsToFetch.add(from);
        if (to !== myPrincipal) principalsToFetch.add(to);
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

      const profileMap: Record<string, UserProfile> = {};
      for (const entry of entries) {
        if (entry) profileMap[entry[0]] = entry[1];
      }
      setProfileCache(profileMap);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [actor, myPrincipal]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    filter === "all"
      ? transactions
      : transactions.filter(
          (t) => t.requestType === (filter === "lend" ? RequestType.lend : RequestType.borrow)
        );

  const getOtherPrincipal = (txn: Transaction) => {
    return txn.fromPrincipal.toString() === myPrincipal
      ? txn.toPrincipal.toString()
      : txn.fromPrincipal.toString();
  };

  const getDisplayName = (principal: string) => {
    const p = profileCache[principal];
    if (!p) return principal.slice(0, 10) + "...";
    return p.displayName || principal.slice(0, 10) + "...";
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="text-lg font-bold text-foreground">Transaction History</h2>

      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {(["all", "lend", "borrow"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-full py-2 text-xs font-medium capitalize transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {f === "all" ? "All" : f === "lend" ? "Lent" : "Borrowed"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <List className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">No {filter === "all" ? "" : filter} transactions yet</p>
          <p className="mt-1 text-xs opacity-70">Completed requests will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((txn) => {
            const isLend = txn.requestType === RequestType.lend;
            const isFromMe = txn.fromPrincipal.toString() === myPrincipal;
            const otherPrincipal = getOtherPrincipal(txn);
            const otherName = getDisplayName(otherPrincipal);

            return (
              <div
                key={txn.id}
                className="rounded-xl bg-card border border-border p-4 shadow-xs fade-in"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold ${
                        isLend ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"
                      }`}
                    >
                      {isLend ? "LENT" : "BORROWED"}
                    </span>
                    <p className="text-xs text-muted-foreground truncate">
                      {isFromMe ? "to" : "from"} {otherName}
                    </p>
                  </div>
                  <p
                    className={`text-base font-bold whitespace-nowrap font-mono-nums ${
                      isLend ? "text-emerald-700" : "text-primary"
                    }`}
                  >
                    {formatAmount(txn.amount)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground/60 font-mono truncate max-w-[140px]">
                    #{txn.requestId.slice(0, 8)}
                  </span>
                  <p className="text-xs text-muted-foreground">{relativeTime(txn.completedAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
