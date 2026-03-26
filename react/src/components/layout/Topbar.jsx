import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';
import { Bell, LogOut, User, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { getEcho } from '../../lib/echo';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?per_page=20').then((r) => r.data),
    staleTime: 30000,
  });

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

  const notifications = data?.notifications || data?.data || [];
  const unreadCount = data?.unread_count ?? notifications.filter((n) => !n.read_at).length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 hover:bg-accent transition-colors lg:hidden"
        >
          <Menu size={20} className="text-muted-foreground" />
        </button>
        <h2 className="text-base sm:text-lg font-semibold text-foreground">
          Gestion des Projets PFE
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/notifications')}
          className="relative rounded-md p-2 hover:bg-accent transition-colors"
        >
          <Bell size={20} className="text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {user?.name?.charAt(0)?.toUpperCase() || <User size={16} />}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-md p-2 hover:bg-accent transition-colors"
          title="Déconnexion"
        >
          <LogOut size={20} className="text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
