import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Bell, Check, CheckCheck, ListTodo, FolderKanban, Mail, AlertTriangle, MessageSquare } from 'lucide-react';
import { POLL_INTERVAL_MS } from '../../lib/unwrapApi';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../lib/services/notificationsApi';
import { SkeletonNotificationRow } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { getNotificationLink } from '../../lib/notificationNav';
import { formatRelativeTimeFr, groupNotificationsByDate } from '../../lib/formatRelativeTime';

function actorLabelForNotification(n) {
  const d = n.data || {};
  if (d.inviter_name) return d.inviter_name;
  if (d.actor_name) return d.actor_name;
  if (d.assigned_by_name) return d.assigned_by_name;
  if (n.type === 'project_invitation') return 'Invitation';
  if (n.type === 'task_assigned') return 'Assignation';
  return 'Équipe';
}

function actorAvatarForNotification(n) {
  const d = n.data || {};
  return d.inviter_avatar_url || d.actor_avatar_url || null;
}

const TYPE_CATEGORIES = {
  task: {
    label: 'Tâches',
    icon: ListTodo,
    color: 'text-blue-600',
    match: (t) => /task|tache/.test(t) && !/delay|overdue|retard/.test(t),
  },
  project: {
    label: 'Projets',
    icon: FolderKanban,
    color: 'text-indigo-600',
    match: (t) => /project|projet/.test(t) && !/(invitation|invite)/.test(t),
  },
  invitation: {
    label: 'Invitations',
    icon: Mail,
    color: 'text-violet-600',
    match: (t) => /invitation|invite/.test(t),
  },
  delay: {
    label: 'Retards',
    icon: AlertTriangle,
    color: 'text-amber-600',
    match: (t) => /delay|overdue|retard/.test(t),
  },
  comment: {
    label: 'Commentaires',
    icon: MessageSquare,
    color: 'text-teal-600',
    match: (t) => /comment/.test(t),
  },
};

function getNotifCategory(type) {
  const t = String(type || '').toLowerCase();
  for (const [key, cfg] of Object.entries(TYPE_CATEGORIES)) {
    if (cfg.match(t)) return key;
  }
  return 'other';
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState('all');

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications({ per_page: 100 }),
    staleTime: 10000,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const allNotifications = data?.notifications ?? [];
  const unreadCount =
    data?.unread_count ?? allNotifications.filter((n) => !(n.read ?? n.read_at)).length;

  // Which categories are actually present
  const presentCategories = useMemo(() => {
    const cats = new Set();
    allNotifications.forEach((n) => cats.add(getNotifCategory(n.type)));
    return cats;
  }, [allNotifications]);

  // Filter by active type
  const notifications = useMemo(() => {
    if (activeType === 'all') return allNotifications;
    return allNotifications.filter((n) => getNotifCategory(n.type) === activeType);
  }, [allNotifications, activeType]);

  const grouped = groupNotificationsByDate(notifications);
  const showSkeleton = (isLoading || isFetching) && allNotifications.length === 0;

  const filteredUnread = notifications.filter((n) => !(n.read ?? n.read_at)).length;

  const handleOpen = (n) => {
    const link = getNotificationLink(n);
    if (!(n.read ?? n.read_at)) {
      markReadMutation.mutate(n.id);
    }
    if (link?.to) {
      navigate(link.to);
    }
  };

  const typeTabs = [
    { key: 'all', label: 'Tout', icon: Bell, count: allNotifications.length },
    ...Object.entries(TYPE_CATEGORIES)
      .filter(([key]) => presentCategories.has(key))
      .map(([key, cfg]) => ({
        key,
        label: cfg.label,
        icon: cfg.icon,
        count: allNotifications.filter((n) => getNotifCategory(n.type) === key).length,
        color: cfg.color,
      })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Toutes lues'}
          </p>
          {isError && (
            <p className="mt-2 text-sm text-red-600">
              {error?.response?.data?.message || error?.message || 'Impossible de charger les notifications.'}
              <Button variant="link" className="ml-2 h-auto p-0 text-sm" type="button" onClick={() => refetch()}>
                Réessayer
              </Button>
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" /> Tout marquer comme lu
          </Button>
        )}
      </div>

      {/* Type filter tabs */}
      {allNotifications.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {typeTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeType === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveType(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                    isActive ? 'bg-white/25 text-inherit' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {showSkeleton ? (
        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
          <CardContent className="p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonNotificationRow key={i} />
            ))}
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={activeType === 'all' ? 'Aucune notification' : `Aucune notification de type « ${TYPE_CATEGORIES[activeType]?.label ?? activeType} »`}
          description={activeType === 'all' ? 'Vous serez informé des assignations, invitations et alertes ici.' : 'Essayez un autre filtre ou revenez plus tard.'}
        >
          {activeType !== 'all' ? (
            <Button variant="outline" type="button" onClick={() => setActiveType('all')}>
              Voir toutes les notifications
            </Button>
          ) : (
            <Button variant="default" type="button" onClick={() => navigate('/projects')}>
              Ouvrir les projets
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {filteredUnread > 0 && activeType !== 'all' && (
            <p className="text-xs text-muted-foreground">{filteredUnread} non lue(s) dans ce filtre</p>
          )}
          {grouped.map((section) => (
            <div key={section.key}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </h2>
              <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
                <CardContent className="p-0">
                  <ul className="divide-y divide-border/60">
                    {section.items.map((notif, idx) => {
                      const read = notif.read_at || notif.read;
                      const link = getNotificationLink(notif);
                      const actorName = actorLabelForNotification(notif);
                      const actorAvatar = actorAvatarForNotification(notif);
                      const category = getNotifCategory(notif.type);
                      const catCfg = TYPE_CATEGORIES[category];
                      return (
                        <motion.li
                          key={notif.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02, duration: 0.2 }}
                          className={`flex items-stretch gap-0 ${read ? 'bg-card' : 'bg-primary/[0.03]'}`}
                        >
                          {/* Category accent bar */}
                          {catCfg && (
                            <div
                              className="w-1 shrink-0 rounded-l-[inherit]"
                              style={{
                                background: category === 'task' ? '#3b82f6'
                                  : category === 'project' ? '#6366f1'
                                  : category === 'invitation' ? '#8b5cf6'
                                  : category === 'delay' ? '#f59e0b'
                                  : category === 'comment' ? '#14b8a6'
                                  : '#94a3b8',
                                opacity: read ? 0.25 : 0.7,
                              }}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpen(notif)}
                            className={`flex min-w-0 flex-1 items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/50 ${
                              link ? 'cursor-pointer' : 'cursor-default'
                            }`}
                          >
                            <UserAvatar name={actorName} src={actorAvatar} size="md" className="mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm ${read ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>
                                {notif.message || notif.data?.message || notif.data?.title || notif.type}
                              </p>
                              {notif.data?.body && (
                                <p className="mt-0.5 text-sm text-muted-foreground">{notif.data.body}</p>
                              )}
                              <div className="mt-1 flex items-center gap-2">
                                <p className="text-xs text-muted-foreground">
                                  {formatRelativeTimeFr(notif.created_at)}
                                </p>
                                {catCfg && (
                                  <span className={`text-[10px] font-medium ${catCfg.color}`}>
                                    · {catCfg.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                          {!read && (
                            <div className="flex shrink-0 items-start border-l border-border/40 py-2 pr-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0"
                                onClick={() => markReadMutation.mutate(notif.id)}
                                disabled={markReadMutation.isPending}
                                title="Marquer comme lu"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </motion.li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
