import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Bell, Check, CheckCheck, Settings, Search, Trash2,
  AlertTriangle, Info, AlertCircle, X, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { getEcho } from '../../lib/echo';
import { getNotificationLink } from '../../lib/notificationNav';
import { formatRelativeTimeFr, groupNotificationsByDate } from '../../lib/formatRelativeTime';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { cn } from '../../lib/utils';

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_GROUPS = [
  { key: '',                                                                label: 'Toutes' },
  { key: 'task_assigned,task_updated,task_completed',                       label: 'Tâches' },
  { key: 'task_comment,comment_added,task_mentioned,mention',               label: 'Commentaires' },
  { key: 'task_delayed,workload_alert',                                      label: 'Alertes' },
  { key: 'project_created,project_updated,project_at_risk',                 label: 'Projets' },
  { key: 'invitation_received,project_invitation,project_invitation_accepted', label: 'Invitations' },
  { key: 'ai_alert',                                                         label: 'IA' },
  { key: 'permission_updated',                                               label: 'Permissions' },
];

const TYPE_LABELS = {
  task_assigned:               'Assignation',
  task_updated:                'Modification',
  task_completed:              'Terminée',
  task_delayed:                'Retard',
  task_comment:                'Commentaire',
  comment_added:               'Commentaire',
  task_mentioned:              'Mention',
  mention:                     'Mention',
  project_created:             'Projet créé',
  project_updated:             'Projet modifié',
  project_at_risk:             'Projet à risque',
  gantt_updated:               'Gantt',
  ai_alert:                    'Alerte IA',
  permission_updated:          'Permission',
  invitation_received:         'Invitation',
  project_invitation:          'Invitation',
  project_invitation_accepted: 'Invitation acceptée',
  workload_alert:              'Surcharge',
};

const TYPE_COLORS = {
  task_assigned:               'bg-indigo-100 text-indigo-700',
  task_updated:                'bg-slate-100 text-slate-700',
  task_completed:              'bg-green-100 text-green-700',
  task_delayed:                'bg-amber-100 text-amber-700',
  task_comment:                'bg-purple-100 text-purple-700',
  comment_added:               'bg-purple-100 text-purple-700',
  task_mentioned:              'bg-pink-100 text-pink-700',
  mention:                     'bg-pink-100 text-pink-700',
  project_at_risk:             'bg-red-100 text-red-700',
  ai_alert:                    'bg-violet-100 text-violet-700',
  permission_updated:          'bg-orange-100 text-orange-700',
  invitation_received:         'bg-blue-100 text-blue-700',
  project_invitation:          'bg-blue-100 text-blue-700',
  workload_alert:              'bg-red-100 text-red-700',
};

// ── Small helpers ────────────────────────────────────────────────────────────

function SeverityIcon({ severity }) {
  if (severity === 'alert')   return <AlertCircle   size={12} className="text-red-500" />;
  if (severity === 'warning') return <AlertTriangle size={12} className="text-amber-500" />;
  return <Info size={12} className="text-blue-400" />;
}

function TypeBadge({ type }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600'}`}>
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

// ── Data fetching ────────────────────────────────────────────────────────────

const fetchPage = ({ pageParam = 1, type = '', unread_only = false, search = '' }) =>
  api.get('/notifications', {
    params: { page: pageParam, per_page: 20, type: type || undefined, unread_only: unread_only || undefined, search: search || undefined },
  }).then((r) => r.data);

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const qc        = useQueryClient();

  const [typeFilter,   setTypeFilter]   = useState('');
  const [unreadOnly,   setUnreadOnly]   = useState(false);
  const [searchInput,  setSearchInput]  = useState('');
  const [search,       setSearch]       = useState('');
  const loaderRef = useRef(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['notifications-page', typeFilter, unreadOnly, search],
    queryFn: ({ pageParam }) => fetchPage({ pageParam, type: typeFilter, unread_only: unreadOnly, search }),
    getNextPageParam: (last) =>
      last.meta?.current_page < last.meta?.last_page ? last.meta.current_page + 1 : undefined,
    initialPageParam: 1,
  });

  const markReadMut   = useMutation({ mutationFn: (id) => api.patch(`/notifications/${id}/read`),      onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); refetch(); } });
  const markAllMut    = useMutation({ mutationFn: () => api.post('/notifications/read-all'),             onSuccess: () => { toast.success('Toutes les notifications ont été lues.'); qc.invalidateQueries({ queryKey: ['notifications'] }); refetch(); } });
  const deleteMut     = useMutation({ mutationFn: (id) => api.delete(`/notifications/${id}`),           onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ['notifications'] }); } });
  const deleteReadMut = useMutation({ mutationFn: () => api.delete('/notifications/read'),              onSuccess: () => { toast.success('Notifications lues supprimées.'); refetch(); qc.invalidateQueries({ queryKey: ['notifications'] }); } });

  // Real-time
  useEffect(() => {
    if (!user?.id) return;
    let ch;
    try {
      const echo = getEcho();
      ch = echo.private(`user.${user.id}`);
      ch.listen('.notification.created', () => { refetch(); qc.invalidateQueries({ queryKey: ['notifications'] }); });
      ch.listen('.notification.updated', () => { refetch(); qc.invalidateQueries({ queryKey: ['notifications'] }); });
    } catch { /* echo not ready */ }
    return () => {
      try { getEcho().leave(`user.${user.id}`); } catch { /* */ }
    };
  }, [user?.id, refetch, qc]);

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current || !hasNextPage) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) fetchNextPage(); },
      { threshold: 0.1 },
    );
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasNextPage, fetchNextPage]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 380);
    return () => clearTimeout(t);
  }, [searchInput]);

  const allNotifications = (data?.pages ?? []).flatMap((p) => p.notifications ?? []);
  const unreadCount      = data?.pages?.[0]?.unread_count ?? 0;
  const grouped          = groupNotificationsByDate(allNotifications);

  const handleRowClick = (n) => {
    if (!n.read && !n.read_at) markReadMut.mutate(n.id);
    const link = getNotificationLink(n);
    if (link?.to) navigate(link.to);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-4">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100">
              <Bell size={20} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => refetch()} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors" title="Rafraîchir">
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => markAllMut.mutate()}
              disabled={markAllMut.isPending || unreadCount === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <CheckCheck size={14} /> Tout lire
            </button>
            <button
              onClick={() => deleteReadMut.mutate()}
              disabled={deleteReadMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-40 transition-colors"
            >
              <Trash2 size={14} /> Vider les lues
            </button>
            <Link to="/notifications/settings" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors" title="Paramètres">
              <Settings size={15} />
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-8 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {TYPE_GROUPS.map((g) => (
              <button
                key={g.key}
                onClick={() => setTypeFilter(g.key)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                  typeFilter === g.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {g.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer w-fit" onClick={() => setUnreadOnly((v) => !v)}>
            <div className={cn('relative h-5 w-9 rounded-full transition-colors', unreadOnly ? 'bg-indigo-600' : 'bg-gray-200')}>
              <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', unreadOnly ? 'translate-x-4' : 'translate-x-0.5')} />
            </div>
            <span className="text-xs font-semibold text-gray-700 select-none">Non lues seulement</span>
          </label>
        </div>

        {/* List */}
        <div className="space-y-3">
          {isLoading && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400 shadow-sm">Chargement…</div>
          )}

          {!isLoading && allNotifications.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
              <Bell size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-500">Aucune notification</p>
              <p className="text-xs text-gray-400 mt-1">{unreadOnly ? 'Toutes vos notifications ont été lues.' : 'Vous êtes à jour !'}</p>
            </div>
          )}

          {grouped.map((section) => (
            <div key={section.key} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <p className="border-b border-gray-100 bg-gray-50/80 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                {section.label}
              </p>
              <ul>
                <AnimatePresence initial={false}>
                  {section.items.map((n) => {
                    const isRead      = n.read ?? !!n.read_at;
                    const msg         = n.message || n.data?.message || n.data?.title || n.type;
                    const actorName   = n.data?.actor_name || n.data?.inviter_name || 'Équipe';
                    const actorAvatar = n.data?.actor_avatar_url || n.data?.inviter_avatar_url || null;
                    const link        = getNotificationLink(n);

                    return (
                      <motion.li
                        key={n.id}
                        layout
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={cn('group border-b border-gray-100 last:border-0 transition-colors', !isRead && 'bg-indigo-50/30')}
                      >
                        <div
                          role={link ? 'button' : undefined}
                          tabIndex={link ? 0 : undefined}
                          onClick={() => handleRowClick(n)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRowClick(n); }}
                          className={cn('flex items-start gap-3 px-4 py-3.5', link && 'cursor-pointer hover:bg-gray-50/60')}
                        >
                          {/* Unread indicator */}
                          <div className="mt-2 shrink-0 w-2.5">
                            {!isRead && <span className="block h-2 w-2 rounded-full bg-indigo-500" />}
                          </div>

                          <UserAvatar name={actorName} src={actorAvatar} size="md" className="shrink-0 mt-0.5" />

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                              <TypeBadge type={n.type} />
                              <SeverityIcon severity={n.severity} />
                            </div>
                            <p className={cn('text-sm leading-snug', isRead ? 'text-gray-500' : 'font-semibold text-gray-900')}>
                              {msg}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">{formatRelativeTimeFr(n.created_at)}</p>
                          </div>

                          {/* Actions (visible on hover) */}
                          <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!isRead && (
                              <button
                                type="button"
                                title="Marquer comme lu"
                                onClick={(e) => { e.stopPropagation(); markReadMut.mutate(n.id); }}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              title="Supprimer"
                              onClick={(e) => { e.stopPropagation(); deleteMut.mutate(n.id); }}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={loaderRef} className="py-2 text-center text-xs text-gray-400">
            {isFetchingNextPage && 'Chargement…'}
            {!hasNextPage && allNotifications.length > 0 && 'Toutes les notifications ont été chargées.'}
          </div>
        </div>
      </div>
    </div>
  );
}
