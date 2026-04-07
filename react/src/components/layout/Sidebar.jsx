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
  const [collapsed, setCollapsed] = useState(false);
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
        'flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight">GPF</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1.5 hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {filteredItems.map(({ to, icon: NavIcon, labelKey, match }) => {
          const isActive = location.pathname === match || location.pathname.startsWith(match + '/');
          return (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              )}
            >
              <NavIcon size={20} className="shrink-0" />
              {!collapsed && <span>{t(labelKey)}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Paramètres (tous les comptes) */}
      <div className="border-t border-white/10 px-2 py-3">
        <NavLink
          to="/settings"
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
            location.pathname.startsWith('/settings')
              ? 'bg-white/15 text-white'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          )}
        >
          <Settings size={20} className="shrink-0" />
          {!collapsed && <span>{t('layout.nav.settings')}</span>}
        </NavLink>
      </div>
    </aside>
  );
}
