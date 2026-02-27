import { useState } from "react";
import { useActor } from "../hooks/useActor";
import { toast } from "sonner";
import { Wallet, User, Phone, Mail, Lock, AlertTriangle } from "lucide-react";

interface OnboardingPageProps {
  onComplete: () => void;
}

interface FormData {
  displayName: string;
  email: string;
  mobile: string;
}

interface FormErrors {
  displayName?: string;
  email?: string;
  mobile?: string;
  general?: string;
}

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.displayName.trim()) {
    errors.displayName = "Name is required";
  } else if (data.displayName.trim().length < 2) {
    errors.displayName = "Name must be at least 2 characters";
  }

  if (!data.email.trim()) {
    errors.email = "Email address is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = "Please enter a valid email address";
  }

  if (!data.mobile.trim()) {
    errors.mobile = "Mobile number is required";
  } else if (!/^\+?[0-9\s\-()]{7,20}$/.test(data.mobile.trim())) {
    errors.mobile = "Please enter a valid mobile number (e.g. +1234567890)";
  }

  return errors;
}

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const { actor } = useActor();
  const [formData, setFormData] = useState<FormData>({
    displayName: "",
    email: "",
    mobile: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) return;

    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      await actor.registerProfile(
        formData.mobile.trim(),
        formData.displayName.trim(),
        formData.email.trim().toLowerCase()
      );
      toast.success("Profile created! Welcome to Borrow & Lend.");
      onComplete();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.toLowerCase().includes("email")) {
        setErrors({ email: "This email address is already registered." });
      } else if (errorMessage.toLowerCase().includes("mobile")) {
        setErrors({ mobile: "This mobile number is already registered." });
      } else {
        setErrors({ general: errorMessage || "Failed to create profile. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.displayName.trim().length >= 2 &&
    formData.email.trim().includes("@") &&
    formData.mobile.trim().length >= 7;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Wallet className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome! Let's set up your profile</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Fill in your details to start tracking borrows and lends
          </p>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name - Required */}
            <div>
              <label
                className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground"
                htmlFor="displayName"
              >
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Your Name <span className="text-destructive">*</span>
              </label>
              <input
                id="displayName"
                type="text"
                value={formData.displayName}
                onChange={(e) => handleChange("displayName", e.target.value)}
                placeholder="e.g. John Doe"
                className={`w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:ring-2 ${
                  errors.displayName
                    ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                    : "border-input focus:border-primary focus:ring-primary/20"
                }`}
                maxLength={100}
                autoComplete="name"
              />
              {errors.displayName && (
                <p className="mt-1 text-xs text-destructive">{errors.displayName}</p>
              )}
            </div>

            {/* Email - Required, Unique, Permanent */}
            <div>
              <label
                className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground"
                htmlFor="email"
              >
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Email Address <span className="text-destructive">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="you@example.com"
                className={`w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:ring-2 ${
                  errors.email
                    ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                    : "border-input focus:border-primary focus:ring-primary/20"
                }`}
                autoComplete="email"
                autoCapitalize="none"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">{errors.email}</p>
              )}
              {/* Permanent email warning */}
              <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 leading-snug">
                  <strong>Important:</strong> Your email will be permanently locked after registration and cannot be changed.
                </p>
              </div>
            </div>

            {/* Mobile - Required, Unique */}
            <div>
              <label
                className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground"
                htmlFor="mobile"
              >
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Mobile Number <span className="text-destructive">*</span>
              </label>
              <input
                id="mobile"
                type="tel"
                value={formData.mobile}
                onChange={(e) => handleChange("mobile", e.target.value)}
                placeholder="+1 234 567 8900"
                className={`w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:ring-2 ${
                  errors.mobile
                    ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                    : "border-input focus:border-primary focus:ring-primary/20"
                }`}
                autoComplete="tel"
              />
              {errors.mobile && (
                <p className="mt-1 text-xs text-destructive">{errors.mobile}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Include country code (e.g. +1 for US, +44 for UK)
              </p>
            </div>

            {errors.general && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
                <p className="text-sm text-destructive">{errors.general}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                "Create Profile"
              )}
            </button>
          </form>
        </div>

        {/* Lock reminder */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          <Lock className="h-3 w-3 text-muted-foreground/50" />
          <p className="text-center text-xs text-muted-foreground/60">
            Email is permanent · Mobile &amp; Name can be updated later
          </p>
        </div>
      </div>
    </div>
  );
}
