"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Check, ExternalLink, Sparkles, AlertTriangle, RefreshCw, X } from "lucide-react";
import type { NotificationItem, NotificationType } from "@/lib/notifications/types";

interface NotificationCenterProps {
  expanded?: boolean;
  triggerClass?: string;
  railPosition?: "rail" | "header" | "custom";
}

export function NotificationCenter({ expanded = false, triggerClass = "" }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Notifications could not be loaded. Try again.");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Notifications are unavailable.");
    } finally { setLoading(false); }
  }
  useEffect(() => {
    const initial = setTimeout(() => void loadNotifications(), 0);
    const interval = setInterval(loadNotifications, 60000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, []);
  useEffect(() => {
    if (isOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [isOpen]);

  async function markRead(id?: string) {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { notificationId: id } : { markAll: true }),
      });
      if (!res.ok) throw new Error("Couldn’t save the read status. Try again.");
      setNotifications(previous => previous.map(item => !id || item.id === id ? { ...item, is_read: true } : item));
      await loadNotifications();
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn’t save the read status."); }
  }
  function getIcon(type: NotificationType) {
    const Icon = type === "deadline" ? AlertTriangle : type === "new_match" ? Sparkles : type === "change" ? RefreshCw : Bell;
    return <Icon size={18} aria-hidden="true"/>;
  }
  return <>
    <button type="button" onClick={() => { setIsOpen(true); setLoading(true); void loadNotifications(); }} className={`notification-trigger ${triggerClass}`} aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"} aria-haspopup="dialog">
      <Bell size={19} aria-hidden="true"/>{expanded && <span>Notifications</span>}{unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}
    </button>
    <dialog ref={dialog} className="adventure-detail notification-dialog" aria-labelledby="notification-title" onClose={() => setIsOpen(false)}>
      <div className="adventure-dialoghead"><h2 id="notification-title">Notifications</h2><button className="adventure-close" aria-label="Close notifications" onClick={() => setIsOpen(false)}><X size={20}/></button></div>
      {unreadCount > 0 && <button className="adventure-text-link" onClick={() => void markRead()}><Check size={16}/> Mark all as read</button>}
      {error && <p className="alert alert-error" role="alert">{error} <button className="underline" onClick={() => void loadNotifications()}>Try again</button></p>}
      {loading && !notifications.length ? <p role="status">Loading notifications…</p> : !error && !notifications.length ? <div className="notification-empty"><Bell size={28} aria-hidden="true"/><h3>You’re all caught up.</h3><p>Your matches and deadline reminders will appear here.</p></div> : <ul className="notification-list">{notifications.map(item => <li key={item.id} className={item.is_read ? '' : 'unread'}><span className="notification-icon">{getIcon(item.type)}</span><div><h3>{item.title}</h3><p>{item.message}</p><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</time><div className="action-row">{item.link_url && <Link href={item.link_url} onClick={() => { void markRead(item.id); setIsOpen(false); }} className="adventure-text-link">Open <ExternalLink size={14}/></Link>}{!item.is_read && <button className="adventure-text-link" onClick={() => void markRead(item.id)}>Mark as read</button>}</div></div></li>)}</ul>}
    </dialog>
  </>;
}
