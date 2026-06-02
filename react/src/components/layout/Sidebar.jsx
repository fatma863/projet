import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard, FolderKanban, Users, UserCog,
  CalendarRange, CalendarDays, ListTodo, Brain,
  Bell, Settings, ShieldCheck, ChevronLeft, ChevronRight,
  History, LogOut,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { usePermissions } from '../../hooks/usePermissions';
import { formatAppRole } from '../../lib/roles';
import api from '../../lib/api';

// ── Navigation sections ────────────────────────────────────────────────────────

// clientHidden: true  → masqué pour les utilisateurs avec le rôle 'client'
// adminOnly: true     → masqué pour tout utilisateur non-admin
const NAV_SECTIONS = [
  {
    key: 'main',
    label: 'Principal',
    items: [
      { to: '/dashboard',     icon: LayoutDashboard, labelKey: 'layout.nav.dashboard',     permission: null },
      { to: '/projects',      icon: FolderKanban,    labelKey: 'layout.nav.projects',      permission: 'project.view' },
      { to: '/tasks',         icon: ListTodo,        labelKey: 'layout.nav.tasks',         permission: 'task.view' },
      { to: '/gantt',         icon: CalendarRange,   labelKey: 'layout.nav.gantt',         permission: 'gantt.view' },
      { to: '/calendar',      icon: CalendarDays,    labelKey: 'layout.nav.calendar',      permission: 'sprint.view' },
      { to: '/ai',            icon: Brain,           labelKey: 'layout.nav.ai',            permission: 'ai.view',     clientHidden: true },
    ],
  },
  {
    key: 'collab',
    label: 'Collaboration',
    items: [
      { to: '/teams',         icon: Users,           labelKey: 'layout.nav.teams',         permission: 'team.view',         adminOnly: true },
      { to: '/users',         icon: UserCog,         labelKey: 'layout.nav.users',         permission: 'user.view',         adminOnly: true },
      { to: '/notifications', icon: Bell,            labelKey: 'layout.nav.notifications', permission: 'notification.view', badge: 'notif' },
    ],
  },
  {
    key: 'admin',
    label: 'Administration',
    items: [
      { to: '/admin/roles',   icon: ShieldCheck,     labelKey: 'layout.nav.roles',         permission: 'role.view' },
      { to: '/audit-log',     icon: History,         labelKey: 'layout.nav.auditLog',      permission: 'task.view',   badge: 'audit', adminOnly: true },
    ],
  },
];

// ── Badge pill ─────────────────────────────────────────────────────────────────

function Badge({ count, pulse = false, label }) {
  if (!count && !label) return null;
  return (
    <span
      className={cn(
        'ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5',
        'text-[10px] font-bold leading-none tabular-nums',
        pulse ? 'bg-emerald-500 text-white animate-pulse' : 'bg-indigo-500/30 text-indigo-200',
      )}
    >
      {label ?? (count > 99 ? '99+' : count)}
    </span>
  );
}

// ── Single nav item ────────────────────────────────────────────────────────────

function NavItem({ item, collapsed, onClose, notifCount, auditBadge }) {
  const { t } = useI18n();
  const location = useLocation();
  const Icon = item.icon;

  const isActive = location.pathname === item.to
    || (item.to !== '/dashboard' && location.pathname.startsWith(item.to + '/'));

  const badge = item.badge === 'notif' ? notifCount
    : item.badge === 'audit' ? auditBadge
    : null;

  return (
    <NavLink
      to={item.to}
      onClick={onClose}
      title={collapsed ? t(item.labelKey) : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
        'transition-all duration-150 ease-out',
        collapsed && 'justify-center px-2',
        isActive
          ? 'bg-indigo-500/20 text-white'
          : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100',
      )}
    >
      {/* Active left indicator */}
      <motion.span
        initial={false}
        animate={{ opacity: isActive ? 1 : 0, scaleY: isActive ? 1 : 0.4 }}
        transition={{ duration: 0.15 }}
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-indigo-400"
      />

      {/* Icon wrapper */}
      <span
        className={cn(
          'relative flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md transition-colors duration-150',
          isActive ? 'text-indigo-300' : 'text-slate-400 group-hover:text-slate-200',
        )}
      >
        <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
      </span>

      {/* Label + badge */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="flex flex-1 items-center truncate"
          >
            {t(item.labelKey)}
            {badge > 0 && (
              <Badge count={badge} pulse={item.badge === 'audit'} />
            )}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Collapsed badge dot */}
      {collapsed && badge > 0 && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-indigo-400 ring-2 ring-slate-900" />
      )}
    </NavLink>
  );
}

// ── Section group ──────────────────────────────────────────────────────────────

function SectionGroup({ section, collapsed, onClose, notifCount, auditBadge, can, isAdmin, isClient }) {
  const { t } = useI18n();
  const visibleItems = section.items.filter(({ permission, adminOnly, clientHidden }) => {
    if (adminOnly && !isAdmin) return false;
    if (clientHidden && isClient) return false;
    return !permission || can(permission);
  });
  if (!visibleItems.length) return null;

  return (
    <div className="space-y-0.5">
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none"
          >
            {section.label}
          </motion.p>
        )}
      </AnimatePresence>

      {collapsed && (
        <div className="mx-auto mb-1 h-px w-6 rounded-full bg-white/10" />
      )}

      {visibleItems.map((item) => (
        <NavItem
          key={item.to}
          item={item}
          collapsed={collapsed}
          onClose={onClose}
          notifCount={notifCount}
          auditBadge={auditBadge}
        />
      ))}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { can, isAdmin } = usePermissions();
  const isClient = user?.roles?.includes('client');

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true'; } catch { return false; }
  });

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('sidebar_collapsed', String(next)); } catch {}
  };

  // Unread notification count
  const { data: notifData } = useQuery({
    queryKey: ['notifications-summary'],
    queryFn: () => api.get('/notifications/summary').then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const notifCount = notifData?.unread_count ?? 0;

  // Audit badge: new activities since last /audit-log visit
  const lastAuditVisit = (() => {
    try { return localStorage.getItem('audit_last_visit') ?? '2020-01-01'; } catch { return '2020-01-01'; }
  })();
  const { data: auditBadgeData } = useQuery({
    queryKey: ['audit-badge', lastAuditVisit],
    queryFn: () =>
      api.get('/activity/feed', { params: { date_from: lastAuditVisit, per_page: 1 } })
        .then((r) => r.data?.meta?.total ?? 0),
    staleTime: 60_000,
    enabled: isAdmin,
  });
  const auditBadge = auditBadgeData > 0 ? auditBadgeData : 0;

  const userInitial    = user?.name?.charAt(0)?.toUpperCase() ?? '?';
  const userRole       = user?.roles?.[0] ?? 'member';
  const userRoleLabel  = formatAppRole(userRole);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-screen flex-col overflow-hidden bg-slate-950 text-sm"
      style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* ── Logo bar ── */}
      <div className="flex h-14 shrink-0 items-center justify-between px-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <AnimatePresence initial={false} mode="wait">
          {!collapsed ? (
            <motion.span
              key="full"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2.5"
            >
              <LogoMark />
              <span className="font-display text-base font-bold tracking-tight text-white">TAC-TIC</span>
            </motion.span>
          ) : (
            <motion.span
              key="icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="mx-auto"
            >
              <LogoMark />
            </motion.span>
          )}
        </AnimatePresence>

        {!collapsed && (
          <button
            onClick={toggle}
            className="rounded-md p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 transition-colors"
            title="Réduire"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* ── Expand button (collapsed only) ── */}
      {collapsed && (
        <div className="flex justify-center py-2">
          <button
            onClick={toggle}
            className="rounded-md p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 transition-colors"
            title="Développer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Navigation ── */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3 scrollbar-none">
        {NAV_SECTIONS.map((section) => (
          <SectionGroup
            key={section.key}
            section={section}
            collapsed={collapsed}
            onClose={onClose}
            notifCount={notifCount}
            auditBadge={auditBadge}
            can={can}
            isAdmin={isAdmin}
            isClient={isClient}
          />
        ))}
      </nav>

      {/* ── Bottom: User + Settings ── */}
      <div className="shrink-0 space-y-0.5 px-2 pb-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Settings link */}
        <NavLink
          to="/settings"
          onClick={onClose}
          title={collapsed ? t('layout.nav.settings') : undefined}
          className={({ isActive }) => cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
            collapsed && 'justify-center px-2',
            isActive
              ? 'bg-indigo-500/20 text-white'
              : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100',
          )}
        >
          <Settings size={17} strokeWidth={1.8} className="shrink-0" />
          {!collapsed && <span>{t('layout.nav.settings')}</span>}
        </NavLink>

        {/* User card */}
        {user && (
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-150',
              collapsed ? 'justify-center px-2' : 'hover:bg-white/[0.04]',
            )}
            title={collapsed ? `${user.name} · ${userRole}` : undefined}
          >
            {/* Avatar */}
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600/40 text-xs font-semibold text-indigo-200 ring-1 ring-indigo-500/30">
                {userInitial}
              </div>
            )}

            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-xs font-semibold text-slate-200 leading-tight">{user.name}</p>
                  <p className="truncate text-[10px] text-slate-500 leading-tight">{userRoleLabel}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {!collapsed && (
              <button
                onClick={logout}
                title="Se déconnecter"
                className="shrink-0 rounded p-1 text-slate-500 hover:bg-white/10 hover:text-slate-300 transition-colors"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.aside>
  );
}

// ── Logo mark component ───────────────────────────────────────────────────────

function LogoMark() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-black text-white shadow-md shadow-indigo-900/50">
      T
    </span>
  );
}
