import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { useActor } from "../../hooks/useActor";
import { relativeTime } from "../../utils/helpers";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import type { Notification } from "../../backend";

interface NotificationsSheetProps {
  open: boolean;
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

export default function NotificationsSheet({ open, onClose, onUnreadCountChange }: NotificationsSheetProps) {
  const { actor } = useActor();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const result = await actor.getMyNotifications();
      setNotifications(result);
      const unread = result.filter((n) => !n.isRead).length;
      onUnreadCountChange(unread);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, actor]);

  const handleMarkRead = async (id: string) => {
    if (!actor) return;
    try {
      await actor.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      const unread = notifications.filter((n) => n.id !== id && !n.isRead).length;
      onUnreadCountChange(unread);
    } catch {
      // silent fail
    }
  };

  const handleMarkAllRead = async () => {
    if (!actor) return;
    try {
      await actor.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      onUnreadCountChange(0);
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full max-w-sm p-0">
        <SheetHeader className="flex flex-row items-center justify-between border-b border-slate-100 px-4 py-4">
          <SheetTitle className="text-base font-semibold">Notifications</SheetTitle>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Mark all read
            </button>
          )}
        </SheetHeader>

        <div className="overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-slate-400">
              <Bell className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => !notification.isRead && handleMarkRead(notification.id)}
                  className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="mt-1.5 flex-shrink-0">
                    {!notification.isRead ? (
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-transparent" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${notification.isRead ? "text-slate-500" : "font-medium text-slate-800"}`}>
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {relativeTime(notification.createdAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
