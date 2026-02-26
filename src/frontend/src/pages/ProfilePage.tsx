import { useState, useEffect, useCallback } from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { getInitials, truncatePrincipal, parseBackendResult } from "../utils/helpers";
import { toast } from "sonner";
import { Pencil, Check, X, Copy, LogOut, User } from "lucide-react";
import type { User as UserType } from "../backend";

export default function ProfilePage() {
  const { actor } = useActor();
  const { clear } = useInternetIdentity();
  const [profile, setProfile] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const result = await actor.getMyProfile();
      setProfile(result);
      setNewName(result.displayName);
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!newName.trim() || !actor) return;
    setSaving(true);
    try {
      const result = await actor.registerOrUpdateProfile(newName.trim());
      const parsed = parseBackendResult(result);
      if (parsed.err) {
        toast.error(parsed.err);
      } else {
        toast.success("Profile updated");
        setEditing(false);
        await load();
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const copyPrincipal = () => {
    if (profile) {
      navigator.clipboard.writeText(profile.principal.toString()).then(() => {
        toast.success("Principal ID copied");
      }).catch(() => {
        toast.error("Failed to copy");
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const initials = profile ? getInitials(profile.displayName) : "?";
  const principalStr = profile ? profile.principal.toString() : "";

  return (
    <div className="px-4 py-4">
      <h2 className="mb-6 text-lg font-bold text-slate-800">Profile</h2>

      <div className="mb-4 flex flex-col items-center rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
          {initials}
        </div>

        {editing ? (
          <div className="flex w-full items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-center text-lg font-semibold text-slate-800 outline-none focus:border-blue-500"
              maxLength={100}
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !newName.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-white disabled:opacity-60"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setNewName(profile?.displayName ?? ""); }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-xl font-semibold text-slate-800">{profile?.displayName}</p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <User className="h-4 w-4 text-slate-400" />
          <p className="text-xs font-medium text-slate-500">Principal ID</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="flex-1 truncate font-mono text-xs text-slate-700">
            {truncatePrincipal(principalStr)}
          </p>
          <button
            type="button"
            onClick={copyPrincipal}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1 font-mono text-xs text-slate-400 break-all">{principalStr}</p>
      </div>

      <button
        type="button"
        onClick={clear}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-4 text-sm font-medium text-red-600 hover:bg-red-100"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );
}
