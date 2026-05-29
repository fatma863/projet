import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, ExternalLink, Settings, AlertTriangle, AlertCircle, Info } from 'lucide-react';
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
import api from '../../lib/api';

// ── Type label/color maps ────────────────────────────────────────────────────

const TYPE_LABELS = {
  task_assigned:               'Assignation',
  task_updated:                'Modifiée',
  task_completed:              'Terminée',
  task_delayed:                'Retard',
  task_comment:                'Commentaire',
  comment_added:               'Commentaire',
  task_mentioned:              'Mention',
  mention:                     'Mention',
  project_created:             'Projet créé',
  project_updated:             'Projet modifié',
  project_at_risk:             'Risque projet',
  'project.paused':            'En pause',
  'project.resumed':           'Reprise',
  gantt_updated:               'Gantt',
  ai_alert:                    'IA',
  permission_updated:          'Permission',
  invitation_received:         'Invitation',
  project_invitation:          'Invitation',
  project_invitation_accepted: 'Acceptée',
  workload_alert:              'Surcharge',
};

const TYPE_PILL_COLORS = {
  task_assigned:               'bg-indigo-100 text-indigo-700',
  task_updated:                'bg-slate-100 text-slate-700',
  task_completed:              'bg-green-100 text-green-700',
  task_delayed:                'bg-amber-100 text-amber-700',
  task_comment:                'bg-purple-100 text-purple-700',
  comment_added:               'bg-purple-100 text-purple-700',
  task_mentioned:              'bg-pink-100 text-pink-700',
  mention:                     'bg-pink-100 text-pink-700',
  project_at_risk:             'bg-red-100 text-red-700',
  'project.paused':            'bg-amber-100 text-amber-700',
  'project.resumed':           'bg-emerald-100 text-emerald-700',
  ai_alert:                    'bg-violet-100 text-violet-700',
  permission_updated:          'bg-orange-100 text-orange-700',
  invitation_received:         'bg-blue-100 text-blue-700',
  project_invitation:          'bg-blue-100 text-blue-700',
  workload_alert:              'bg-red-100 text-red-700',
};

function SeverityIcon({ severity }) {
  if (severity === 'alert')   return <AlertCircle   size={11} className="text-red-500 shrink-0" />;
  if (severity === 'warning') return <AlertTriangle size={11} className="text-amber-500 shrink-0" />;
  return null;
}

function TypePill({ type }) {
  const label = TYPE_LABELS[type];
  if (!label) return null;
  return (
    <span className={`inline-flex rounded-full px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide ${TYPE_PILL_COLORS[type] ?? 'bg-gray-100 text-gray-500'}`}>
      {label}
    </span>
  );
}

function actorLabel(n) {
  const d = n.data || {};
  return d.inviter_name || d.actor_name || d.assigned_by_name || 'Équipe';
}

function actorAvatar(n) {
  const d = n.data || {};
  return d.inviter_avatar_url || d.actor_avatar_url || null;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function NotificationDropdown() {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const qc           = useQueryClient();
  const [open, setOpen]         = useState(false);
  const [showUnread, setShowUnread] = useState(false);
  const rootRef      = useRef(null);
  const prevUnreadRef = useRef(null);

  const { data, isError, isLoading, isFetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications({ per_page: 15 }),
    staleTime: 10000,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const markReadMut = useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMut = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      toast.success('Toutes les notifications ont été lues.');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Toast on new unread
  useEffect(() => {
    const unread = data?.unread_count ?? 0;
    if (prevUnreadRef.current !== null && unread > prevUnreadRef.current) {
      const latest = (data?.notifications ?? [])[0];
      const msg = latest?.message || latest?.data?.message || 'Nouvelle notification';
      toast.message(msg, {
        duration: 4500,
        icon: <Bell size={16} className="text-indigo-600" />,
      });
    }
    prevUnreadRef.current = unread;
  }, [data?.unread_count]);

  // WebSocket
  useEffect(() => {
    if (!user?.id) return;
    const echo = getEcho();
    const channel = echo.private(`user.${user.id}`);
    channel.listen('.notification.created', () => qc.invalidateQueries({ queryKey: ['notifications'] }));
    channel.listen('.notification.updated', () => qc.invalidateQueries({ queryKey: ['notifications'] }));
    return () => { echo.leave(`private-user.${user.id}`); };
  }, [qc, user?.id]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const all           = data?.notifications ?? [];
  const unreadCount   = data?.unread_count ?? all.filter((n) => !n.read_at && !n.read).length;
  const displayed     = showUnread ? all.filter((n) => !(n.read ?? !!n.read_at)) : all;
  const grouped       = groupNotificationsByDate(displayed);
  const showSkeleton  = (isLoading || isFetching) && all.length === 0;

  const handleRowClick = (n) => {
    const link = getNotificationLink(n);
    if (!(n.read ?? n.read_at)) markReadMut.mutate(n.id);
    setOpen(false);
    if (link?.to) navigate(link.to);
  };

  return (
    <div className="relative" ref={rootRef}>
      {/* Bell button */}
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
            className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,26rem)] overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg shadow-black/5"
          >
            {/* Header */}
            <div className="border-b border-border/80 bg-muted/20 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">Notifications</p>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllMut.mutate()}
                      disabled={markAllMut.isPending}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
                      title="Tout marquer comme lu"
                    >
                      <CheckCheck size={12} /> Tout lire
                    </button>
                  )}
                  <a
                    href="/notifications/settings"
                    onClick={(e) => { e.preventDefault(); setOpen(false); navigate('/notifications/settings'); }}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    title="Paramètres"
                  >
                    <Settings size={13} />
                  </a>
                </div>
              </div>

              {/* Filter toggle */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowUnread(false)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${!showUnread ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent'}`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => setShowUnread(true)}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${showUnread ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent'}`}
                >
                  Non lues {unreadCount > 0 && `(${unreadCount})`}
                </button>
              </div>

              {isError && <p className="mt-1 text-xs text-red-600">Erreur de chargement</p>}
            </div>

            {/* Body */}
            <ul className="max-h-[min(26rem,72vh)] overflow-y-auto">
              {showSkeleton ? (
                <li className="px-1 py-2">
                  {Array.from({ length: 5 }).map((_, i) => <SkeletonNotificationRow key={i} />)}
                </li>
              ) : displayed.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {showUnread ? 'Aucune notification non lue.' : 'Aucune notification.'}
                </li>
              ) : (
                grouped.map((section) => (
                  <li key={section.key} className="border-b border-border/40 last:border-0">
                    <p className="sticky top-0 z-[1] bg-card/95 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                      {section.label}
                    </p>
                    <ul>
                      {section.items.map((n, idx) => {
                        const isRead = n.read ?? !!n.read_at;
                        const msg    = n.message || n.data?.message || n.data?.title || n.type;
                        const sev    = n.severity || 'info';
                        const link   = getNotificationLink(n);

                        return (
                          <motion.li
                            key={n.id}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.025, duration: 0.18 }}
                            className={`border-b border-border/30 last:border-0 ${isRead ? 'bg-card' : 'bg-primary/[0.03]'}`}
                          >
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => handleRowClick(n)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowClick(n); } }}
                              className={`group flex cursor-pointer gap-3 px-3 py-2.5 transition-colors hover:bg-accent/60 ${!link ? 'cursor-default hover:bg-transparent' : ''}`}
                            >
                              {/* Unread dot */}
                              <div className="mt-1.5 w-2 shrink-0">
                                {!isRead && <span className="block h-2 w-2 rounded-full bg-primary" />}
                              </div>

                              <UserAvatar name={actorLabel(n)} src={actorAvatar(n)} size="md" className="mt-0.5 shrink-0" />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <TypePill type={n.type} />
                                  <SeverityIcon severity={sev} />
                                </div>
                                <p className={`text-sm leading-snug ${isRead ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>
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
                                  className="shrink-0 self-start rounded-lg p-1.5 transition-colors hover:bg-accent opacity-0 group-hover:opacity-100"
                                  onClick={(e) => { e.stopPropagation(); markReadMut.mutate(n.id); }}
                                  disabled={markReadMut.isPending}
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

            {/* Footer */}
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 border-t border-border/80 bg-muted/10 px-3 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-accent"
              onClick={() => { setOpen(false); navigate('/notifications'); }}
            >
              Tout voir <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
