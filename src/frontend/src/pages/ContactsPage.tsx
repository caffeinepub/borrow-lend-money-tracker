import { useState, useEffect, useCallback } from "react";
import { useActor } from "../hooks/useActor";
import { getInitials, truncatePrincipal, parseBackendResult } from "../utils/helpers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import { Plus, Users, Search } from "lucide-react";
import { Principal } from "@dfinity/principal";
import type { Contact } from "../backend";

export default function ContactsPage() {
  const { actor } = useActor();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [principalId, setPrincipalId] = useState("");
  const [nickname, setNickname] = useState("");
  const [adding, setAdding] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const result = await actor.getMyContacts();
      setContacts(result);
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const filteredContacts = contacts.filter((c) =>
    c.nickName.toLowerCase().includes(search.toLowerCase()) ||
    c.contactPrincipal.toString().includes(search)
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!principalId.trim() || !actor) return;
    setAdding(true);
    try {
      const principal = Principal.fromText(principalId.trim());
      const result = await actor.addContact(principal, nickname.trim());
      const parsed = parseBackendResult(result);
      if (parsed.err) {
        toast.error(parsed.err);
      } else {
        toast.success("Contact added successfully");
        setPrincipalId("");
        setNickname("");
        setShowAdd(false);
        await loadContacts();
      }
    } catch {
      toast.error("Invalid Principal ID format");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Contacts</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
          {contacts.length}
        </span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-blue-500"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <Users className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">{search ? "No matching contacts" : "No contacts yet"}</p>
          {!search && (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="mt-3 text-sm font-medium text-blue-600"
            >
              Add your first contact
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredContacts.map((contact) => {
            const displayName = contact.nickName || truncatePrincipal(contact.contactPrincipal.toString());
            const initials = getInitials(contact.nickName || "?");
            return (
              <div key={contact.id} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800 truncate">{displayName}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {truncatePrincipal(contact.contactPrincipal.toString())}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
        aria-label="Add contact"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={showAdd} onOpenChange={(v) => !v && setShowAdd(false)}>
        <DialogContent className="max-w-sm rounded-2xl p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-lg font-semibold">Add Contact</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 px-6 pb-6 pt-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="principalId">
                Principal ID
              </label>
              <input
                id="principalId"
                type="text"
                value={principalId}
                onChange={(e) => setPrincipalId(e.target.value)}
                placeholder="e.g. xxxxx-xxxxx-xxxxx-cai"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="nicknameInput">
                Nickname (optional)
              </label>
              <input
                id="nicknameInput"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. John"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding || !principalId.trim()}
                className="flex flex-1 items-center justify-center rounded-xl bg-blue-600 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {adding ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Add Contact"
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
