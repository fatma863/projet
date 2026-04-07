import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getEcho } from '../../lib/echo';
import { useAuth } from '../../contexts/AuthContext';
import { POLL_INTERVAL_MS } from '../../lib/unwrapApi';
import { fetchNotifications, markNotificationRead } from '../../lib/services/notificationsApi';
import { getNotificationLink } from '../../lib/notificationNav';
import { formatRelativeTimeFr, groupNotificationsByDate } from '../../lib/formatRelativeTime';
import { UserAvatar } from '../ui/UserAvatar';
import { SkeletonNotificationRow } from '../ui/Skeleton';

function severityRing(severity) {
  switch (severity) {
    case 'alert':
      return 'ring-red-200';
    case 'warning':
      return 'ring-amber-200';
    default:
      return 'ring-slate-200';
  }
}

function actorLabelForNotification(n) {
  const d = n.data || {};
  if (d.inviter_name) return d.inviter_name;
  if (d.actor_name) return d.actor_name;
  if (d.assigned_by_name) return d.assigned_by_name;
  if (n.type === 'project_invitation') return 'Invitation';
  if (n.type === 'task_assigned') return 'Assignation';
  if (n.type === 'project_invitation_accepted') return 'Membre';
  return 'Équipe';
}

export default function NotificationDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const prevUnreadRef = useRef(null);

  const { data, isError, isLoading, isFetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications({ per_page: 15 }),
    staleTime: 10000,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId) => markNotificationRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    const unread = data?.unread_count ?? 0;
    if (prevUnreadRef.current !== null && unread > prevUnreadRef.current) {
      toast.message('Nouvelle notification', { duration: 3500 });
    }
    prevUnreadRef.current = unread;
    return undefined;
  }, [data?.unread_count]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const echo = getEcho();
    const channel = echo.private(`user.${user.id}`);

    channel.listen('.notification.created', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
    channel.listen('.notification.updated', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      echo.leave(`private-user.${user.id}`);
    };
  }, [queryClient, user?.id]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unread_count ?? notifications.filter((n) => !n.read_at && !n.read).length;
  const grouped = groupNotificationsByDate(notifications);

  const handleRowClick = (n) => {
    const link = getNotificationLink(n);
    if (!(n.read ?? n.read_at)) {
      markReadMutation.mutate(n.id);
    }
    setOpen(false);
    if (link?.to) {
      navigate(link.to);
    }
  };

  const showSkeleton = (isLoading || isFetching) && notifications.length === 0;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl p-2 transition-colors hover:bg-accent"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={20} className="text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold text-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,24rem)] overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg shadow-black/5"
          >
            <div className="border-b border-border/80 bg-muted/20 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              {isError && <p className="mt-1 text-xs text-red-600">Erreur de chargement</p>}
              {unreadCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <ul className="max-h-[min(24rem,70vh)] overflow-y-auto">
              {showSkeleton ? (
                <li className="px-1 py-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonNotificationRow key={i} />
                  ))}
                </li>
              ) : notifications.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm text-muted-foreground">Aucune notification</li>
              ) : (
                grouped.map((section) => (
                  <li key={section.key} className="border-b border-border/40 last:border-0">
                    <p className="sticky top-0 z-[1] bg-card/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                      {section.label}
                    </p>
                    <ul>
                      {section.items.map((n, idx) => {
                        const isRead = n.read ?? !!n.read_at;
                        const msg = n.message || n.data?.message || n.data?.title || n.type;
                        const sev = n.severity || 'info';
                        const link = getNotificationLink(n);
                        const actorName = actorLabelForNotification(n);
                        return (
                          <motion.li
                            key={n.id}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03, duration: 0.2 }}
                            className={`border-b border-border/40 last:border-0 ${
                              isRead ? 'bg-card' : 'bg-primary/[0.04]'
                            }`}
                          >
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => handleRowClick(n)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleRowClick(n);
                                }
                              }}
                              className={`flex cursor-pointer gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/60 ${
                                !isRead ? `ring-1 ring-inset ${severityRing(sev)}` : ''
                              } ${!link ? 'cursor-default hover:bg-transparent' : ''}`}
                            >
                              <UserAvatar name={actorName} size="md" className="mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-sm leading-snug ${
                                    isRead ? 'text-muted-foreground' : 'font-medium text-foreground'
                                  }`}
                                >
                                  {msg}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {formatRelativeTimeFr(n.created_at)}
                                </p>
                              </div>
                              {!isRead && (
                                <button
                                  type="button"
                                  title="Marquer comme lu"
                                  className="shrink-0 self-start rounded-lg p-1.5 transition-colors hover:bg-accent"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markReadMutation.mutate(n.id);
                                  }}
                                  disabled={markReadMutation.isPending}
                                >
                                  <Check className="h-4 w-4 text-muted-foreground" />
                                </button>
                              )}
                            </div>
                          </motion.li>
                        );
                      })}
                    </ul>
                  </li>
                ))
              )}
            </ul>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 border-t border-border/80 bg-muted/10 px-3 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-accent"
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
            >
              Tout voir <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
