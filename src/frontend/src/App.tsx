import { useState, useEffect, useCallback } from "react";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useActor } from "./hooks/useActor";
import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import MainLayout from "./components/app/MainLayout";
import { Toaster } from "./components/ui/sonner";
import type { UserProfile } from "./backend.d";

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated || !actor) {
      setProfile(null);
      return;
    }
    setLoadingProfile(true);
    try {
      const result = await actor.getMyProfile();
      setProfile(result);
    } catch {
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [isAuthenticated, actor]);

  useEffect(() => {
    if (!actorFetching) {
      loadProfile();
    }
  }, [loadProfile, actorFetching]);

  if (isInitializing || actorFetching || loadingProfile || profile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <Toaster />
      </>
    );
  }

  // Profile is incomplete if null or missing required fields
  const isProfileComplete =
    profile !== null &&
    profile.displayName?.trim().length > 0 &&
    profile.email?.trim().length > 0 &&
    profile.mobile?.trim().length > 0;

  if (!isProfileComplete) {
    return (
      <>
        <OnboardingPage onComplete={loadProfile} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <MainLayout profile={profile} onProfileUpdate={loadProfile} />
      <Toaster />
    </>
  );
}
