import { useState, useEffect, useCallback } from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { getInitials } from "../utils/helpers";
import { toast } from "sonner";
import { LogOut, Lock, Phone, User, Mail } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import type { UserProfile } from "../backend.d";

interface ProfilePageProps {
  onProfileUpdate?: () => void;
}

export default function ProfilePage({ onProfileUpdate }: ProfilePageProps) {
  const { actor } = useActor();
  const { clear, identity } = useInternetIdentity();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [mobile, setMobile] = useState("");
  const [errors, setErrors] = useState<{ displayName?: string; mobile?: string; general?: string }>({});

  const principalStr = identity?.getPrincipal().toString() ?? "";

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const result = await actor.getMyProfile();
      setProfile(result);
      if (result) {
        setDisplayName(result.displayName ?? "");
        setMobile(result.mobile ?? "");
      }
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    load();
  }, [load]);

  // Track changes — only displayName and mobile are editable
  useEffect(() => {
    if (!profile) return;
    const changed =
      displayName !== (profile.displayName ?? "") ||
      mobile !== (profile.mobile ?? "");
    setHasChanges(changed);
  }, [displayName, mobile, profile]);

  const validateFields = () => {
    const errs: typeof errors = {};
    if (!displayName.trim()) {
      errs.displayName = "Name is required";
    } else if (displayName.trim().length < 2) {
      errs.displayName = "Name must be at least 2 characters";
    }
    if (!mobile.trim()) {
      errs.mobile = "Mobile number is required";
    } else if (!/^\+?[0-9\s\-()]{7,20}$/.test(mobile.trim())) {
      errs.mobile = "Enter a valid mobile number with country code";
    }
    return errs;
  };

  const handleSave = async () => {
    if (!actor || !hasChanges) return;

    const validationErrors = validateFields();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      await actor.updateProfile(mobile.trim(), displayName.trim());
      toast.success("Profile updated successfully");
      setHasChanges(false);
      await load();
      onProfileUpdate?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.toLowerCase().includes("mobile")) {
        setErrors({ mobile: "This mobile number is already registered." });
      } else {
        setErrors({ general: errorMessage || "Failed to update profile." });
        toast.error("Failed to update profile");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-4 space-y-4">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const initials = profile ? getInitials(profile.displayName || "?") : "?";
  const memberSince = profile
    ? new Date(Number(profile.createdAt) / 1_000_000).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <TooltipProvider>
      <div className="px-4 py-4 space-y-4">
        <h2 className="text-lg font-bold text-foreground">Profile</h2>

        {/* Avatar section */}
        <div className="flex flex-col items-center rounded-2xl bg-card border border-border p-6 shadow-xs">
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shadow-sm">
            {initials}
          </div>
          <p className="text-lg font-bold text-foreground">
            {profile?.displayName || "Anonymous"}
          </p>
          {memberSince && (
            <p className="mt-1 text-xs text-muted-foreground/60">Member since {memberSince}</p>
          )}
        </div>

        {/* Form fields */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-xs space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Account Details</h3>

          {/* Display Name — Editable */}
          <div>
            <label
              className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              htmlFor="profile-displayName"
            >
              <User className="h-3.5 w-3.5" />
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="profile-displayName"
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setErrors((prev) => ({ ...prev, displayName: undefined }));
              }}
              placeholder="Your name"
              className={`w-full rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:ring-2 ${
                errors.displayName
                  ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                  : "border-input focus:border-primary focus:ring-primary/20"
              }`}
              maxLength={100}
            />
            {errors.displayName && (
              <p className="mt-1 text-xs text-destructive">{errors.displayName}</p>
            )}
          </div>

          {/* Email — READ ONLY, Permanent */}
          <div>
            <label
              className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              htmlFor="profile-email"
            >
              <Mail className="h-3.5 w-3.5" />
              Email (permanent)
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Email cannot be changed after registration</p>
                </TooltipContent>
              </Tooltip>
            </label>
            <div className="relative">
              <input
                id="profile-email"
                type="email"
                value={profile?.email ?? ""}
                readOnly
                className="w-full rounded-xl border border-input bg-muted/50 px-4 py-2.5 pr-10 text-sm text-muted-foreground outline-none cursor-not-allowed"
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <p className="mt-1 text-xs text-amber-600/80">
              Email is permanent and cannot be changed
            </p>
          </div>

          {/* Mobile — Editable */}
          <div>
            <label
              className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
              htmlFor="profile-mobile"
            >
              <Phone className="h-3.5 w-3.5" />
              Mobile Number <span className="text-destructive">*</span>
            </label>
            <input
              id="profile-mobile"
              type="tel"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value);
                setErrors((prev) => ({ ...prev, mobile: undefined }));
              }}
              placeholder="+1 234 567 8900"
              className={`w-full rounded-xl border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:ring-2 ${
                errors.mobile
                  ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                  : "border-input focus:border-primary focus:ring-primary/20"
              }`}
            />
            {errors.mobile && (
              <p className="mt-1 text-xs text-destructive">{errors.mobile}</p>
            )}
          </div>

          {errors.general && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive">{errors.general}</p>
            </div>
          )}

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : hasChanges ? (
              "Save Changes"
            ) : (
              "No Changes"
            )}
          </button>
        </div>

        {/* Principal ID */}
        {principalStr && (
          <div className="rounded-2xl bg-card border border-border p-4 shadow-xs">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Your Identity (Principal)</p>
            <p className="font-mono text-xs text-muted-foreground/80 break-all">{principalStr}</p>
          </div>
        )}

        {/* Sign Out */}
        <button
          type="button"
          onClick={clear}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 py-4 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/50 pb-2">
          © 2026. Built with ❤️ using{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </TooltipProvider>
  );
}
