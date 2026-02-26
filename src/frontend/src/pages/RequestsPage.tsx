import { useState, useEffect, useCallback } from "react";
import { useActor } from "../hooks/useActor";
import { formatAmount, truncatePrincipal, relativeTime, parseBackendResult } from "../utils/helpers";
import NewRequestModal from "../components/app/NewRequestModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, ArrowLeftRight } from "lucide-react";
import type { BorrowLendRequest, Contact } from "../backend";

type Tab = "received" | "sent" | "all";

interface RequestsPageProps {
  contacts: Contact[];
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "Pending"
      ? "bg-amber-100 text-amber-800"
      : status === "Accepted"
        ? "bg-green-100 text-green-800"
        : "bg-red-100 text-red-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>{status}</span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const classes =
    type === "Borrow" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>{type}</span>
  );
}

export default function RequestsPage({ contacts }: RequestsPageProps) {
  const { actor } = useActor();
  const [sent, setSent] = useState<BorrowLendRequest[]>([]);
  const [received, setReceived] = useState<BorrowLendRequest[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("received");
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; accept: boolean } | null>(null);
  const [responding, setResponding] = useState(false);

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const result = await actor.getMyRequests();
      setSent(result.sent);
      setReceived(result.received);
    } catch {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRespond = async () => {
    if (!confirmAction || !actor) return;
    setResponding(true);
    try {
      const result = await actor.respondToRequest(confirmAction.id, confirmAction.accept);
      const parsed = parseBackendResult(result);
      if (parsed.err) {
        toast.error(parsed.err);
      } else {
        toast.success(confirmAction.accept ? "Request accepted" : "Request rejected");
        setConfirmAction(null);
        await load();
      }
    } catch {
      toast.error("Failed to respond to request");
    } finally {
      setResponding(false);
    }
  };

  const getDisplayList = (): Array<BorrowLendRequest & { isReceived: boolean }> => {
    if (activeTab === "received") return received.map((r) => ({ ...r, isReceived: true }));
    if (activeTab === "sent") return sent.map((r) => ({ ...r, isReceived: false }));
    const all = [
      ...received.map((r) => ({ ...r, isReceived: true })),
      ...sent.map((r) => ({ ...r, isReceived: false })),
    ];
    return all.sort((a, b) => Number(b.createdAt - a.createdAt));
  };

  const displayList = getDisplayList();

  return (
    <div className="px-4 py-4">
      <h2 className="mb-4 text-lg font-bold text-slate-800">Requests</h2>

      <div className="mb-4 flex rounded-xl border border-slate-200 overflow-hidden bg-white">
        {(["received", "sent", "all"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab}
            {tab === "received" && received.filter((r) => r.status === "Pending").length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white">
                {received.filter((r) => r.status === "Pending").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : displayList.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <ArrowLeftRight className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">No {activeTab} requests</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayList.map((req) => (
            <div key={req.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <TypeBadge type={req.requestType} />
                  <StatusBadge status={req.status} />
                  <span className="text-xs text-slate-400">
                    {req.isReceived ? "from " : "to "}
                    {req.isReceived
                      ? truncatePrincipal(req.fromPrincipal.toString())
                      : truncatePrincipal(req.toPrincipal.toString())}
                  </span>
                </div>
                <p className="text-base font-bold text-slate-800 whitespace-nowrap">
                  {formatAmount(req.amount)}
                </p>
              </div>
              {req.notes && (
                <p className="mt-2 text-xs text-slate-500 italic">{req.notes}</p>
              )}
              <p className="mt-1 text-right text-xs text-slate-400">
                {relativeTime(req.createdAt)}
              </p>
              {req.isReceived && req.status === "Pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmAction({ id: req.id, accept: false })}
                    className="flex-1 rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-medium text-red-600"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAction({ id: req.id, accept: true })}
                    className="flex-1 rounded-lg bg-green-600 py-2 text-xs font-medium text-white"
                  >
                    Accept
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowNewRequest(true)}
        className="fixed bottom-24 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
        aria-label="New request"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AlertDialog open={!!confirmAction} onOpenChange={(v) => !v && setConfirmAction(null)}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.accept ? "Accept Request?" : "Reject Request?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.accept
                ? "This will create a transaction record. This action cannot be undone."
                : "Are you sure you want to reject this request?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRespond}
              disabled={responding}
              className={
                confirmAction?.accept ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              }
            >
              {responding ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : confirmAction?.accept ? (
                "Accept"
              ) : (
                "Reject"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NewRequestModal
        open={showNewRequest}
        onClose={() => setShowNewRequest(false)}
        onSuccess={load}
        contacts={contacts}
      />
    </div>
  );
}
