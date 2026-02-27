import { useState, useEffect, useCallback } from "react";
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

  const loadNotifications = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    try {
      const result = await actor.getMyNotifications();
      setNotifications(result);
      const unread = result.filter((n) => !n.read).length;
      onUnreadCountChange(unread);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [actor, onUnreadCountChange]);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, loadNotifications]);

  const handleMarkRead = async (id: string) => {
    if (!actor) return;
    try {
      await actor.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      const unread = notifications.filter((n) => n.id !== id && !n.read).length;
      onUnreadCountChange(unread);
    } catch {
      // silent fail
    }
  };

  const handleMarkAllRead = async () => {
    if (!actor) return;
    try {
      await actor.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onUnreadCountChange(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full max-w-sm p-0">
        <SheetHeader className="flex flex-row items-center justify-between border-b border-border px-4 py-4">
          <SheetTitle className="text-base font-semibold">Notifications</SheetTitle>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-medium text-primary hover:opacity-80 transition-opacity"
            >
              Mark all read
            </button>
          )}
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100vh-65px)]">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-muted-foreground">
              <Bell className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">No notifications yet</p>
              <p className="mt-1 text-xs opacity-70">You'll see updates here when activity happens</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => !notification.read && handleMarkRead(notification.id)}
                  className={`flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/30 ${
                    !notification.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="mt-1.5 shrink-0">
                    {!notification.read ? (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-transparent" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${notification.read ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
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
