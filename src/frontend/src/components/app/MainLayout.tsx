import { useState, useEffect, useCallback, useRef } from "react";
import { useActor } from "../../hooks/useActor";
import DashboardPage from "../../pages/DashboardPage";
import ContactsPage from "../../pages/ContactsPage";
import RequestsPage from "../../pages/RequestsPage";
import TransactionsPage from "../../pages/TransactionsPage";
import ProfilePage from "../../pages/ProfilePage";
import NotificationsSheet from "./NotificationsSheet";
import { Home, Users, ArrowLeftRight, List, User, Bell } from "lucide-react";
import type { UserProfile } from "../../backend.d";

type Tab = "dashboard" | "contacts" | "requests" | "transactions" | "profile";

interface MainLayoutProps {
  profile: UserProfile;
  onProfileUpdate: () => void;
}

const tabs: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: "dashboard", label: "Home", Icon: Home },
  { id: "contacts", label: "Contacts", Icon: Users },
  { id: "requests", label: "Requests", Icon: ArrowLeftRight },
  { id: "transactions", label: "History", Icon: List },
  { id: "profile", label: "Profile", Icon: User },
];

const POLL_INTERVAL = 30_000;

export default function MainLayout({ profile, onProfileUpdate }: MainLayoutProps) {
  const { actor } = useActor();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!actor) return;
    try {
      const count = await actor.getUnreadCount();
      setUnreadCount(Number(count));
    } catch {
      // silent
    }
  }, [actor]);

  useEffect(() => {
    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchUnreadCount]);

  const displayName = profile.displayName || "User";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-4 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-sm">
            <span className="text-sm font-bold text-primary-foreground">B</span>
          </div>
          <h1 className="text-base font-bold text-foreground">Borrow &amp; Lend</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-muted-foreground max-w-[120px] truncate">
            {displayName}
          </span>
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pt-14 pb-20 max-w-[430px] mx-auto w-full">
        <div className={activeTab === "dashboard" ? "block" : "hidden"}>
          <DashboardPage onNavigate={(tab) => setActiveTab(tab as Tab)} />
        </div>
        <div className={activeTab === "contacts" ? "block" : "hidden"}>
          <ContactsPage />
        </div>
        <div className={activeTab === "requests" ? "block" : "hidden"}>
          <RequestsPage />
        </div>
        <div className={activeTab === "transactions" ? "block" : "hidden"}>
          <TransactionsPage />
        </div>
        <div className={activeTab === "profile" ? "block" : "hidden"}>
          <ProfilePage onProfileUpdate={onProfileUpdate} />
        </div>
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center border-t border-border bg-card/95 backdrop-blur-sm px-1">
        <div className="flex w-full max-w-[430px] mx-auto">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors rounded-xl mx-0.5 ${
                activeTab === id
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <NotificationsSheet
        open={showNotifications}
        onClose={() => {
          setShowNotifications(false);
          fetchUnreadCount();
        }}
        onUnreadCountChange={setUnreadCount}
      />
    </div>
  );
}
