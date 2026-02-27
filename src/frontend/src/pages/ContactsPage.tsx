import { useState, useEffect, useCallback, useRef } from "react";
import { useActor } from "../hooks/useActor";
import { getInitials } from "../utils/helpers";
import { toast } from "sonner";
import { Users, Search, UserCheck, X, Phone, Mail, Plus } from "lucide-react";
import type { Contact, UserProfile } from "../backend.d";
import { Principal } from "@dfinity/principal";

const DEBOUNCE_MS = 350;

function maskMobile(mobile: string): string {
  if (!mobile) return "";
  if (mobile.length <= 4) return mobile;
  return mobile.slice(0, 3) + "••••" + mobile.slice(-2);
}

function maskEmail(email: string): string {
  if (!email) return "";
  const [user, domain] = email.split("@");
  if (!domain) return email;
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}${"*".repeat(Math.min(user.length - 2, 4))}${user[user.length - 1]}@${domain}`;
}

interface SearchResult {
  principal: Principal;
  profile: UserProfile;
}

export default function ContactsPage() {
  const { actor } = useActor();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactProfiles, setContactProfiles] = useState<Record<string, UserProfile>>({});
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [contactPrincipals, setContactPrincipals] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [addingSet, setAddingSet] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadContacts = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const result = await actor.getContacts();
      setContacts(result);

      const principals = new Set(result.map((c) => c.principal.toString()));
      setContactPrincipals(principals);

      // Fetch profiles for each contact in parallel using getUserProfile
      const profileEntries = await Promise.all(
        result.map(async (c) => {
          try {
            const profile = await actor.getUserProfile(c.principal);
            return profile ? ([c.principal.toString(), profile] as const) : null;
          } catch {
            return null;
          }
        })
      );

      const profileMap: Record<string, UserProfile> = {};
      for (const entry of profileEntries) {
        if (entry) profileMap[entry[0]] = entry[1];
      }
      setContactProfiles(profileMap);
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

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
        const mapped: SearchResult[] = results.map(([principal, profile]) => ({
          principal,
          profile,
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

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), DEBOUNCE_MS);
  };

  const handleAdd = async (principal: Principal, name: string) => {
    if (!actor) return;
    const key = principal.toString();
    setAddingSet((prev) => new Set([...prev, key]));
    try {
      await actor.addContact(principal);
      toast.success(`${name} added to contacts!`);
      setContactPrincipals((prev) => new Set([...prev, key]));
      await loadContacts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add contact";
      toast.error(msg);
    } finally {
      setAddingSet((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleRemove = async (contactPrincipal: Principal) => {
    if (!actor) return;
    const key = contactPrincipal.toString();
    setRemovingId(key);
    try {
      await actor.removeContact(contactPrincipal);
      toast.success("Contact removed");
      setContacts((prev) => prev.filter((c) => c.principal.toString() !== key));
      setContactPrincipals((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setContactProfiles((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch {
      toast.error("Failed to remove contact");
    } finally {
      setRemovingId(null);
    }
  };

  const showSearchResults = search.trim().length >= 2;

  // Filter existing contacts list when not in global search mode
  const filteredContacts = contacts.filter((c) => {
    const p = contactProfiles[c.principal.toString()];
    if (!search.trim()) return true;
    if (!p) return true;
    const term = search.toLowerCase();
    return (
      (p.displayName?.toLowerCase().includes(term) ?? false) ||
      p.mobile.includes(term) ||
      p.email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Contacts</h2>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {contacts.length}
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Enter mobile number or email to find people..."
          className="w-full rounded-xl border border-input bg-card py-3 pl-10 pr-10 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSearchResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search hint */}
      {search.trim().length === 0 && contacts.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground text-center py-1">
          Search by mobile number or email to find and add contacts
        </p>
      )}
      {search.trim().length === 1 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Type at least 2 characters to search
        </p>
      )}

      {/* Search Results */}
      {showSearchResults && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            {searchLoading
              ? "Searching..."
              : `${searchResults.length} user${searchResults.length !== 1 ? "s" : ""} found`}
          </p>
          {searchLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground rounded-xl bg-card border border-border">
              <Users className="mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">No users found</p>
              <p className="text-xs text-center mt-1 opacity-70 px-4">
                Try a different mobile number or email address
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((result) => {
                const principalStr = result.principal.toString();
                const isAlreadyContact = contactPrincipals.has(principalStr);
                const initials = getInitials(result.profile.displayName || "?");
                const isAdding = addingSet.has(principalStr);

                return (
                  <div
                    key={principalStr}
                    className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 shadow-xs"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground text-sm truncate">
                        {result.profile.displayName || "Unknown"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {result.profile.mobile && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 opacity-50" />
                            {maskMobile(result.profile.mobile)}
                          </span>
                        )}
                        {result.profile.email && (
                          <>
                            {result.profile.mobile && (
                              <span className="text-muted-foreground/30">·</span>
                            )}
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 opacity-50" />
                              {maskEmail(result.profile.email)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {isAlreadyContact ? (
                      <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary shrink-0">
                        <UserCheck className="h-3 w-3" />
                        <span>Added</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isAdding}
                        onClick={() => handleAdd(result.principal, result.profile.displayName || "User")}
                        className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                      >
                        {isAdding ? (
                          <div className="h-3 w-3 animate-spin rounded-full border border-primary-foreground border-t-transparent" />
                        ) : (
                          <>
                            <Plus className="h-3 w-3" />
                            Add
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Separator before contact list */}
          {contacts.length > 0 && (
            <div className="flex items-center gap-3 pt-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">Your contacts</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
        </div>
      )}

      {/* Contacts List */}
      {loading && !showSearchResults ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filteredContacts.length === 0 && !showSearchResults ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <Users className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">
            {contacts.length === 0 ? "No contacts yet" : "No matching contacts"}
          </p>
          {contacts.length === 0 && (
            <p className="mt-2 text-xs text-center opacity-70 max-w-[240px]">
              Use the search above to find people by their mobile number or email address
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {(showSearchResults ? contacts : filteredContacts).map((contact) => {
            const profile = contactProfiles[contact.principal.toString()];
            const displayName = profile
              ? profile.displayName || "Unknown"
              : contact.principal.toString().slice(0, 12) + "...";
            const initials = getInitials(displayName);
            const isRemoving = removingId === contact.principal.toString();

            return (
              <div
                key={contact.principal.toString()}
                className="flex items-center gap-3 rounded-xl bg-card border border-border p-4 shadow-xs fade-in"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{displayName}</p>
                  {profile && (
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {profile.mobile && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 opacity-50" />
                          {maskMobile(profile.mobile)}
                        </span>
                      )}
                      {profile.email && (
                        <>
                          {profile.mobile && (
                            <span className="text-muted-foreground/30">·</span>
                          )}
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {maskEmail(profile.email)}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(contact.principal)}
                  disabled={isRemoving}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                  aria-label="Remove contact"
                >
                  {isRemoving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
