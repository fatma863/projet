import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserCog,
  CalendarRange,
  CalendarDays,
  ListTodo,
  Brain,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { isGuestViewer } from '../../lib/roles';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'layout.nav.dashboard', match: '/dashboard' },
  { to: '/projects', icon: FolderKanban, labelKey: 'layout.nav.projects', match: '/projects' },
  { to: '/tasks', icon: ListTodo, labelKey: 'layout.nav.tasks', match: '/tasks' },
  { to: '/calendar', icon: CalendarDays, labelKey: 'layout.nav.calendar', match: '/calendar' },
  { to: '/teams', icon: Users, labelKey: 'layout.nav.teams', match: '/teams' },
  { to: '/users', icon: UserCog, labelKey: 'layout.nav.users', match: '/users' },
  { to: '/gantt', icon: CalendarRange, labelKey: 'layout.nav.gantt', match: '/gantt' },
  { to: '/ai', icon: Brain, labelKey: 'layout.nav.ai', match: '/ai' },
  { to: '/notifications', icon: Bell, labelKey: 'layout.nav.notifications', match: '/notifications' },
];

export default function Sidebar({ onClose }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const location = useLocation();
  const isAdmin = user?.roles?.includes('admin');
  const isViewer = isGuestViewer(user);
  const filteredItems = navItems.filter((item) => {
    if (item.to === '/teams') return isAdmin;
    if (item.to === '/users') return isAdmin;
    if (isViewer) {
      return ['/dashboard', '/projects', '/tasks', '/notifications'].includes(item.to);
    }
    if (item.to === '/gantt') return true;
    return true;
  });

  return (
    <aside
      className={cn(
        'flex h-screen flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
        {!collapsed && (
          <span className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-black text-white shadow-lg animate-pulse-glow">T</span>
            <span className="font-display">TAC-TIC</span>
          </span>
        )}
        {collapsed && (
          <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-black text-white shadow-lg animate-pulse-glow">T</span>
        )}
        {!collapsed && (
          <button
            onClick={() => {
              const next = !collapsed;
              setCollapsed(next);
              try { localStorage.setItem('sidebar_collapsed', String(next)); } catch {}
            }}
            className="rounded-lg p-1.5 hover:bg-white/10 transition-all duration-200"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center py-2">
          <button
            onClick={() => {
              setCollapsed(false);
              try { localStorage.setItem('sidebar_collapsed', 'false'); } catch {}
            }}
            className="rounded-lg p-1.5 hover:bg-white/10 transition-all duration-200"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {filteredItems.map(({ to, icon: NavIcon, labelKey, match }) => {
          const isActive = location.pathname === match || location.pathname.startsWith(match + '/');
          return (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              title={collapsed ? t(labelKey) : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-indigo-500/20 text-white border-l-[3px] border-indigo-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border-l-[3px] border-transparent'
              )}
            >
              <NavIcon size={20} className="shrink-0" />
              {!collapsed && <span>{t(labelKey)}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User preview */}
      {!collapsed && user && (
        <div className="border-t border-white/10 px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full border border-white/20 object-cover" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/30 text-sm font-medium text-white">
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="border-t border-white/10 px-2 py-3">
        <NavLink
          to="/settings"
          onClick={onClose}
          title={collapsed ? t('layout.nav.settings') : undefined}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
            collapsed && 'justify-center px-0',
            location.pathname.startsWith('/settings')
              ? 'bg-indigo-500/20 text-white border-l-[3px] border-indigo-400'
              : 'text-slate-400 hover:bg-white/5 hover:text-white border-l-[3px] border-transparent'
          )}
        >
          <Settings size={20} className="shrink-0" />
          {!collapsed && <span>{t('layout.nav.settings')}</span>}
        </NavLink>
      </div>
    </aside>
  );
}
