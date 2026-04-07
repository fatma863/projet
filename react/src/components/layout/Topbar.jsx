import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { LogOut, User, Menu, Mail } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import NotificationDropdown from '../notifications/NotificationDropdown';
import GlobalSearchBar from './GlobalSearchBar';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const { data: pendingInv } = useQuery({
    queryKey: ['invitations-pending'],
    queryFn: () => api.get('/invitations/pending').then((r) => r.data),
    enabled: Boolean(user),
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-2 hover:bg-accent transition-colors lg:hidden"
        >
          <Menu size={20} className="text-muted-foreground" />
        </button>
        <h2 className="hidden shrink-0 text-base font-semibold text-foreground sm:block sm:text-lg lg:inline">
          {t('layout.appTitle')}
        </h2>
        <GlobalSearchBar />
      </div>

      <div className="flex shrink-0 items-center gap-4">
        {pendingInv?.pending_count > 0 && (
          <Link
            to="/dashboard"
            className="relative rounded-full p-2 text-amber-700 transition-colors hover:bg-amber-50"
            title={
              pendingInv.pending_count > 1
                ? t('layout.invitePendingMany', { count: pendingInv.pending_count })
                : t('layout.invitePendingOne')
            }
          >
            <Mail className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold leading-none text-white">
              {pendingInv.pending_count > 9 ? '9+' : pendingInv.pending_count}
            </span>
          </Link>
        )}
        <NotificationDropdown />

        <div className="flex items-center gap-3">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              {user?.name?.charAt(0)?.toUpperCase() || <User size={16} />}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-md p-2 hover:bg-accent transition-colors"
          title={t('layout.logoutTitle')}
        >
          <LogOut size={20} className="text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
