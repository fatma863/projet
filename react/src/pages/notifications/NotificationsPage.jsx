import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Bell, Check, CheckCheck } from 'lucide-react';
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

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications({ per_page: 50 }),
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

  const notifications = data?.notifications ?? [];
  const unreadCount =
    data?.unread_count ?? notifications.filter((n) => !(n.read ?? n.read_at)).length;
  const grouped = groupNotificationsByDate(notifications);
  const showSkeleton = (isLoading || isFetching) && notifications.length === 0;

  const handleOpen = (n) => {
    const link = getNotificationLink(n);
    if (!(n.read ?? n.read_at)) {
      markReadMutation.mutate(n.id);
    }
    if (link?.to) {
      navigate(link.to);
    }
  };

  return (
    <div className="space-y-6">
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
          title="Aucune notification"
          description="Vous serez informé des assignations, invitations et alertes ici."
        >
          <Button variant="default" type="button" onClick={() => navigate('/projects')}>
            Ouvrir les projets
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-6">
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
                      return (
                        <motion.li
                          key={notif.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02, duration: 0.2 }}
                          className={`flex items-stretch gap-0 ${read ? 'bg-card' : 'bg-primary/[0.03]'}`}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpen(notif)}
                            className={`flex min-w-0 flex-1 items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/50 ${
                              link ? 'cursor-pointer' : 'cursor-default'
                            }`}
                          >
                            <UserAvatar name={actorName} size="md" className="mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm ${read ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>
                                {notif.message || notif.data?.message || notif.data?.title || notif.type}
                              </p>
                              {notif.data?.body && (
                                <p className="mt-0.5 text-sm text-muted-foreground">{notif.data.body}</p>
                              )}
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatRelativeTimeFr(notif.created_at)}
                              </p>
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
