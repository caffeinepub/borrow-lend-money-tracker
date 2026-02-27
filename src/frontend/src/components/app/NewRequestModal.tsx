import { useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useActor } from "../../hooks/useActor";
import { toast } from "sonner";
import { Principal } from "@dfinity/principal";
import { RequestType } from "../../backend";
import type { UserProfile, Contact } from "../../backend.d";
import { Search, ArrowDown, ArrowUp, X, User, Phone, Mail } from "lucide-react";

const DEBOUNCE_MS = 350;

interface NewRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function maskMobile(mobile: string): string {
  if (!mobile) return "";
  if (mobile.length <= 4) return mobile;
  return mobile.slice(0, 3) + "••••" + mobile.slice(-2);
}

interface ContactItem {
  principalStr: string;
  name: string;
  mobile: string;
  email: string;
  isFromContacts: boolean;
}

export default function NewRequestModal({ open, onClose, onSuccess }: NewRequestModalProps) {
  const { actor } = useActor();
  const [selectedPrincipal, setSelectedPrincipal] = useState<string>("");
  const [selectedName, setSelectedName] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [requestType, setRequestType] = useState<RequestType>(RequestType.borrow);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Contact search
  const [contactSearch, setContactSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ContactItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadContacts = useCallback(async () => {
    if (!actor || contactsLoaded) return;
    try {
      const result = await actor.getContacts();
      const withProfiles = await Promise.all(
        result.map(async (c: Contact) => {
          try {
            const profile = await actor.getUserProfile(c.principal);
            return {
              principalStr: c.principal.toString(),
              name: profile?.displayName || c.principal.toString().slice(0, 12) + "...",
              mobile: profile?.mobile ?? "",
              email: profile?.email ?? "",
              isFromContacts: true,
            };
          } catch {
            return {
              principalStr: c.principal.toString(),
              name: c.principal.toString().slice(0, 12) + "...",
              mobile: "",
              email: "",
              isFromContacts: true,
            };
          }
        })
      );
      setContacts(withProfiles);
      setContactsLoaded(true);
    } catch {
      // silent
    }
  }, [actor, contactsLoaded]);

  const doSearch = useCallback(
    async (term: string) => {
      if (!actor || term.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      try {
        // Returns Array<[Principal, UserProfile]>
        const results = await actor.searchContactByMobileOrEmail(term.trim());
        const mapped: ContactItem[] = results.map(([principal, profile]: [Principal, UserProfile]) => ({
          principalStr: principal.toString(),
          name: profile.displayName || "Unknown",
          mobile: profile.mobile ?? "",
          email: profile.email ?? "",
          isFromContacts: false,
        }));
        setSearchResults(mapped);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [actor]
  );

  const handleContactSearchChange = (value: string) => {
    setContactSearch(value);
    setShowDropdown(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(value), DEBOUNCE_MS);
    } else {
      setSearchResults([]);
    }
  };

  const handleFocus = () => {
    loadContacts();
    setShowDropdown(true);
  };

  const selectContact = (principalStr: string, name: string) => {
    setSelectedPrincipal(principalStr);
    setSelectedName(name);
    setContactSearch("");
    setShowDropdown(false);
    setSearchResults([]);
  };

  const clearSelection = () => {
    setSelectedPrincipal("");
    setSelectedName("");
    setContactSearch("");
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrincipal || !amount || !description || !actor) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    if (!description.trim()) {
      toast.error("Please add a description");
      return;
    }

    setLoading(true);
    try {
      let principal: Principal;
      try {
        principal = Principal.fromText(selectedPrincipal);
      } catch {
        toast.error("Invalid contact selected");
        return;
      }

      await actor.createRequest(principal, requestType, amountNum, description.trim());
      toast.success("Request sent successfully!");
      // Reset form
      setSelectedPrincipal("");
      setSelectedName("");
      setAmount("");
      setDescription("");
      setRequestType(RequestType.borrow);
      setContactSearch("");
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create request";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPrincipal("");
    setSelectedName("");
    setAmount("");
    setDescription("");
    setRequestType(RequestType.borrow);
    setContactSearch("");
    setShowDropdown(false);
    onClose();
  };

  // Determine what to show in the dropdown
  const isSearchMode = contactSearch.trim().length >= 2;
  const displayItems: ContactItem[] = isSearchMode
    ? searchResults
    : contacts.slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-base font-bold text-foreground">New Request</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5 pt-3">
          {/* Request Type Toggle */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">I want to</p>
            <div className="flex rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setRequestType(RequestType.borrow)}
                className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                  requestType === RequestType.borrow
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <ArrowDown className="h-4 w-4" />
                Borrow
              </button>
              <button
                type="button"
                onClick={() => setRequestType(RequestType.lend)}
                className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                  requestType === RequestType.lend
                    ? "bg-emerald-600 text-white"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <ArrowUp className="h-4 w-4" />
                Lend
              </button>
            </div>
          </div>

          {/* Contact Picker */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {requestType === RequestType.borrow ? "Borrowing from" : "Lending to"}
            </p>

            {selectedPrincipal ? (
              <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="flex-1 text-sm font-medium text-foreground">{selectedName}</span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => handleContactSearchChange(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  placeholder="Search contacts or by mobile/email..."
                  className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-4 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                />

                {/* Dropdown */}
                {showDropdown && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                    {searchLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    ) : displayItems.length === 0 ? (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        {isSearchMode ? "No users found" : "No contacts yet — add contacts first"}
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto">
                        {!isSearchMode && (
                          <p className="px-3 pt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Your contacts
                          </p>
                        )}
                        {isSearchMode && (
                          <p className="px-3 pt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Search results
                          </p>
                        )}
                        {displayItems.map((item, idx) => (
                          <button
                            key={item.principalStr || idx}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              if (item.principalStr) {
                                selectContact(item.principalStr, item.name);
                              }
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted transition-colors"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {item.mobile && (
                                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                    <Phone className="h-2.5 w-2.5 opacity-60" />
                                    {maskMobile(item.mobile)}
                                  </span>
                                )}
                                {item.email && !item.mobile && (
                                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                    <Mail className="h-2.5 w-2.5 opacity-60" />
                                    {item.email.slice(0, 16)}
                                    {item.email.length > 16 ? "..." : ""}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
              htmlFor="amount-input"
            >
              Amount ($)
            </label>
            <input
              id="amount-input"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors font-mono-nums"
            />
          </div>

          {/* Description */}
          <div>
            <label
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
              htmlFor="req-desc"
            >
              Description <span className="text-destructive">*</span>
            </label>
            <textarea
              id="req-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this for? (e.g. Lunch, Movie tickets...)"
              rows={2}
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors resize-none"
              maxLength={200}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedPrincipal || !amount || !description.trim()}
              className={`flex-1 flex items-center justify-center rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 hover:opacity-90 ${
                requestType === RequestType.lend ? "bg-emerald-600" : "bg-primary"
              }`}
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
