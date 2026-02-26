import { useState, useEffect, useCallback } from "react";
import { useActor } from "../hooks/useActor";
import { formatAmount, truncatePrincipal, relativeTime } from "../utils/helpers";
import NewRequestModal from "../components/app/NewRequestModal";
import { Plus, Scale, Clock, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import type { Contact, Transaction } from "../backend";

interface DashboardSummary {
  totalLent: number;
  totalBorrowed: number;
  pendingRequests: bigint;
}

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { actor } = useActor();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const [summaryResult, txnsResult, contactsResult] = await Promise.all([
        actor.getDashboardSummary(),
        actor.getMyTransactions(),
        actor.getMyContacts(),
      ]);
      setSummary(summaryResult);
      setRecentTxns(txnsResult.slice(0, 5));
      setContacts(contactsResult);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  const netBalance = summary ? summary.totalLent - summary.totalBorrowed : 0;

  return (
    <div className="px-4 py-4">
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <>
          <h2 className="mb-4 text-lg font-bold text-slate-800">Dashboard</h2>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-sm">
              <div className="mb-1 flex items-center gap-1">
                <TrendingDown className="h-3 w-3 opacity-80" />
                <p className="text-xs opacity-80">Borrowed</p>
              </div>
              <p className="text-sm font-bold leading-tight">
                {summary ? formatAmount(summary.totalBorrowed) : "$0.00"}
              </p>
            </div>
            <div className="rounded-2xl bg-green-600 p-3 text-white shadow-sm">
              <div className="mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 opacity-80" />
                <p className="text-xs opacity-80">Lent</p>
              </div>
              <p className="text-sm font-bold leading-tight">
                {summary ? formatAmount(summary.totalLent) : "$0.00"}
              </p>
            </div>
            <div
              className={`rounded-2xl p-3 text-white shadow-sm ${
                netBalance >= 0 ? "bg-emerald-500" : "bg-red-500"
              }`}
            >
              <div className="mb-1 flex items-center gap-1">
                <Wallet className="h-3 w-3 opacity-80" />
                <p className="text-xs opacity-80">Net</p>
              </div>
              <p className="text-sm font-bold leading-tight">{formatAmount(netBalance)}</p>
            </div>
          </div>

          {summary && Number(summary.pendingRequests) > 0 && (
            <button
              type="button"
              onClick={() => onNavigate("requests")}
              className="mb-4 flex w-full items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-left border border-amber-200"
            >
              <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-medium text-amber-800">
                {Number(summary.pendingRequests)} pending request
                {Number(summary.pendingRequests) !== 1 ? "s" : ""} awaiting response
              </p>
              <span className="ml-auto text-xs text-amber-600">View</span>
            </button>
          )}

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Recent Transactions</h2>
            <button
              type="button"
              onClick={() => setShowNewRequest(true)}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              <Plus className="h-3 w-3" />
              New Request
            </button>
          </div>

          {recentTxns.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-slate-400">
              <Scale className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">No transactions yet</p>
              <button
                type="button"
                onClick={() => setShowNewRequest(true)}
                className="mt-3 text-sm font-medium text-blue-600"
              >
                Create your first request
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTxns.map((txn) => (
                <div key={txn.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-lg px-2 py-1 text-xs font-medium ${
                          txn.transactionType === "Borrow"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {txn.transactionType}
                      </span>
                      <p className="text-xs text-slate-400">
                        {truncatePrincipal(txn.toPrincipal.toString())}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        txn.transactionType === "Borrow" ? "text-blue-600" : "text-green-600"
                      }`}
                    >
                      {formatAmount(txn.amount)}
                    </p>
                  </div>
                  <p className="mt-1 text-right text-xs text-slate-400">
                    {relativeTime(txn.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <NewRequestModal
        open={showNewRequest}
        onClose={() => setShowNewRequest(false)}
        onSuccess={load}
        contacts={contacts}
      />
    </div>
  );
}
