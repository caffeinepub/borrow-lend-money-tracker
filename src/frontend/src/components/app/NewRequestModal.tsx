import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useActor } from "../../hooks/useActor";
import { parseBackendResult } from "../../utils/helpers";
import { toast } from "sonner";
import type { Contact } from "../../backend";
import { Principal } from "@dfinity/principal";

interface NewRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contacts: Contact[];
}

export default function NewRequestModal({ open, onClose, onSuccess, contacts }: NewRequestModalProps) {
  const { actor } = useActor();
  const [selectedContact, setSelectedContact] = useState("");
  const [amount, setAmount] = useState("");
  const [requestType, setRequestType] = useState<"Borrow" | "Lend">("Borrow");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !amount || !actor) return;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }
    setLoading(true);
    try {
      const principal = Principal.fromText(selectedContact);
      const result = await actor.createRequest(principal, amountNum, requestType, notes);
      const parsed = parseBackendResult(result);
      if (parsed.err) {
        toast.error(parsed.err);
      } else {
        toast.success("Request created successfully");
        setSelectedContact("");
        setAmount("");
        setNotes("");
        setRequestType("Borrow");
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error("Failed to create request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg font-semibold">New Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6 pt-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="contact">
              Contact
            </label>
            <select
              id="contact"
              value={selectedContact}
              onChange={(e) => setSelectedContact(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="">Select a contact...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.contactPrincipal.toString()}>
                  {c.nickName || c.contactPrincipal.toString().slice(0, 12) + "..."}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="amount">
              Amount ($)
            </label>
            <input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Request Type</p>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setRequestType("Borrow")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  requestType === "Borrow"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                I am Borrowing
              </button>
              <button
                type="button"
                onClick={() => setRequestType("Lend")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  requestType === "Lend"
                    ? "bg-green-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                I am Lending
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="notes">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedContact || !amount}
              className="flex-1 flex items-center justify-center rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Send Request"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
