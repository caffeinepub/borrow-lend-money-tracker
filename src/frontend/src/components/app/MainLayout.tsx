import { useState, useEffect, useCallback } from "react";
import { useActor } from "../../hooks/useActor";
import DashboardPage from "../../pages/DashboardPage";
import ContactsPage from "../../pages/ContactsPage";
import RequestsPage from "../../pages/RequestsPage";
import TransactionsPage from "../../pages/TransactionsPage";
import ProfilePage from "../../pages/ProfilePage";
import NotificationsSheet from "./NotificationsSheet";
import { Home, Users, ArrowLeftRight, List, User, Bell } from "lucide-react";
import type { Contact } from "../../backend";

type Tab = "dashboard" | "contacts" | "requests" | "transactions" | "profile";

interface MainLayoutProps {
  profile: { displayName: string };
  onProfileUpdate: () => void;
}

const tabs: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: "dashboard", label: "Home", Icon: Home },
  { id: "contacts", label: "Contacts", Icon: Users },
  { id: "requests", label: "Requests", Icon: ArrowLeftRight },
  { id: "transactions", label: "Transactions", Icon: List },
  { id: "profile", label: "Profile", Icon: User },
];

export default function MainLayout({ profile }: MainLayoutProps) {
  const { actor } = useActor();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const loadContacts = useCallback(async () => {
    if (!actor) return;
    try {
      const result = await actor.getMyContacts();
      setContacts(result);
    } catch {
      // silent
    }
  }, [actor]);

  const loadUnreadCount = useCallback(async () => {
    if (!actor) return;
    try {
      const notifs = await actor.getMyNotifications();
      setUnreadCount(notifs.filter((n) => !n.isRead).length);
    } catch {
      // silent
    }
  }, [actor]);

  useEffect(() => {
    loadUnreadCount();
    loadContacts();
  }, [loadUnreadCount, loadContacts]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-sm font-bold text-white">B</span>
          </div>
          <h1 className="text-base font-bold text-slate-800">Borrow &amp; Lend</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{profile.displayName}</span>
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 pt-14 pb-20">
        {activeTab === "dashboard" && (
          <DashboardPage onNavigate={(tab) => setActiveTab(tab as Tab)} />
        )}
        {activeTab === "contacts" && <ContactsPage />}
        {activeTab === "requests" && <RequestsPage contacts={contacts} />}
        {activeTab === "transactions" && <TransactionsPage />}
        {activeTab === "profile" && <ProfilePage />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center border-t border-slate-100 bg-white px-2">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
              activeTab === id ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </nav>

      <NotificationsSheet
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUnreadCountChange={setUnreadCount}
      />
    </div>
  );
}
