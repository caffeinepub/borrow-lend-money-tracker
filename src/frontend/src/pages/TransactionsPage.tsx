import { useState, useEffect, useCallback } from "react";
import { useActor } from "../hooks/useActor";
import { formatAmount, truncatePrincipal, relativeTime } from "../utils/helpers";
import { List } from "lucide-react";
import type { Transaction } from "../backend";

type Filter = "all" | "Borrow" | "Lend";

export default function TransactionsPage() {
  const { actor } = useActor();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const result = await actor.getMyTransactions();
      setTransactions(result);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    filter === "all"
      ? transactions
      : transactions.filter((t) => t.transactionType === filter);

  return (
    <div className="px-4 py-4">
      <h2 className="mb-4 text-lg font-bold text-slate-800">Transactions</h2>

      <div className="mb-4 flex rounded-xl border border-slate-200 overflow-hidden bg-white">
        {(["all", "Borrow", "Lend"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
              filter === f ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f === "all" ? "All" : `${f}ed`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <List className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((txn) => (
            <div key={txn.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      txn.transactionType === "Borrow"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {txn.transactionType === "Borrow" ? "Borrowed" : "Lent"}
                  </span>
                </div>
                <p
                  className={`text-base font-bold ${
                    txn.transactionType === "Borrow" ? "text-blue-600" : "text-green-600"
                  }`}
                >
                  {formatAmount(txn.amount)}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  {txn.transactionType === "Borrow" ? "from " : "to "}
                  {truncatePrincipal(
                    txn.transactionType === "Borrow"
                      ? txn.fromPrincipal.toString()
                      : txn.toPrincipal.toString()
                  )}
                </p>
                <p className="text-xs text-slate-400">{relativeTime(txn.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
