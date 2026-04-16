import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { LogOut, User, Menu, Mail, Sun, Moon } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import NotificationDropdown from '../notifications/NotificationDropdown';
import GlobalSearchBar from './GlobalSearchBar';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  const { data: pendingInv } = useQuery({
    queryKey: ['invitations-pending'],
    queryFn: () => api.get('/invitations/pending').then((r) => r.data),
    enabled: Boolean(user),
  });

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="relative z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/80 px-4 shadow-sm backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 hover:bg-accent transition-all duration-200 lg:hidden"
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
              className="h-8 w-8 shrink-0 rounded-full border border-border object-cover ring-2 ring-primary/20"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium ring-2 ring-primary/20">
              {user?.name?.charAt(0)?.toUpperCase() || <User size={16} />}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={toggleDark}
          className="rounded-lg p-2 hover:bg-accent transition-all duration-200"
          title={dark ? 'Mode clair' : 'Mode sombre'}
        >
          {dark
            ? <Sun size={20} className="text-muted-foreground transition-transform duration-300 hover:rotate-12" />
            : <Moon size={20} className="text-muted-foreground transition-transform duration-300 hover:rotate-12" />
          }
        </button>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="rounded-lg p-2 hover:bg-accent transition-all duration-200"
          title={t('layout.logoutTitle')}
        >
          <LogOut size={20} className="text-muted-foreground" />
        </button>
      </div>

      {/* Logout confirmation */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="mx-4 w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-lg font-semibold text-foreground">Déconnexion</h3>
              <p className="mt-2 text-sm text-muted-foreground">Êtes-vous sûr de vouloir vous déconnecter ?</p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-all duration-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handleLogout}
                  className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-all duration-200 active:scale-[0.97]"
                >
                  Déconnexion
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
