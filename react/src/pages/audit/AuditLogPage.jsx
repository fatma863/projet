import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { getEcho } from '../../lib/echo';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { Select } from '../../components/ui/Select';
import {
  History, ArrowLeft, Filter, RotateCcw, Search, FileText,
  Pencil, Plus, Trash2, LayoutGrid, MessageSquare, Clock,
  Link2, Users, FolderKanban, User, ChevronDown,
  AlertTriangle, Info, AlertCircle, Activity, BarChart2,
  ArrowRight, Wifi, TrendingUp, TrendingDown, Zap,
  AlertOctagon, UserX, Flame,
} from 'lucide-react';
import {
  getActivityHeadline,
  getActivityDetailRows,
  getActivityIconName,
  workflowBadgeClass,
  priorityBadgeClass,
} from '../../lib/projectActivityHumanize';
import { cn } from '../../lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const ICON_MAP = {
  pencil: Pencil, plus: Plus, trash: Trash2, layout: LayoutGrid,
  message: MessageSquare, clock: Clock, link: Link2,
  users: Users, folder: FolderKanban, user: User, activity: History,
};

const SEVERITY_CONFIG = {
  info:     { label: 'Info',      color: 'bg-sky-500',    text: 'text-sky-700',    bg: 'bg-sky-50 border-sky-200',    icon: Info },
  warning:  { label: 'Attention', color: 'bg-amber-500',  text: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',  icon: AlertTriangle },
  critical: { label: 'Critique',  color: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50 border-red-200',    icon: AlertCircle },
};

const ACTION_CATEGORIES = {
  created:   { label: 'Créations',     color: 'bg-emerald-500' },
  updated:   { label: 'Modifications', color: 'bg-blue-500' },
  deleted:   { label: 'Suppressions',  color: 'bg-red-500' },
  moved:     { label: 'Déplacements',  color: 'bg-amber-500' },
  commented: { label: 'Commentaires',  color: 'bg-teal-500' },
  assigned:  { label: 'Assignations',  color: 'bg-indigo-500' },
};

const MODULES = [
  { value: 'task',    label: 'Tâches' },
  { value: 'project', label: 'Projets' },
];

const MODULE_COLORS = {
  task: 'bg-indigo-500', project: 'bg-violet-500',
  sprint: 'bg-amber-500', comment: 'bg-teal-500',
};

function getActionCategory(action) {
  const a = String(action || '').toLowerCase();
  if (a.includes('creat') || a.includes('added')) return 'created';
  if (a.includes('delet') || a.includes('remov')) return 'deleted';
  if (a.includes('mov') || a.includes('transfer')) return 'moved';
  if (a.includes('comment')) return 'commented';
  if (a.includes('assign')) return 'assigned';
  return 'updated';
}

function formatDateGroupFr(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function groupActivitiesByDate(activities) {
  const groups = [];
  let currentDate = null;
  let currentItems = [];
  for (const a of activities) {
    const dateKey = a.created_at ? new Date(a.created_at).toDateString() : 'unknown';
    if (dateKey !== currentDate) {
      if (currentItems.length) groups.push({ date: currentDate, label: formatDateGroupFr(currentItems[0].created_at), items: currentItems });
      currentDate = dateKey;
      currentItems = [a];
    } else {
      currentItems.push(a);
    }
  }
  if (currentItems.length) groups.push({ date: currentDate, label: formatDateGroupFr(currentItems[0].created_at), items: currentItems });
  return groups;
}

// ── CSS Charts ────────────────────────────────────────────────────────────────

function HBar({ label, value, max, color = 'bg-indigo-500', suffix = '', avatar }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      {avatar !== undefined && (
        <UserAvatar name={label} size="sm" className="!h-6 !w-6 shrink-0" />
      )}
      <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-5 rounded-full bg-muted/60 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={cn('h-full rounded-full', color)}
        />
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">{value}{suffix}</span>
    </div>
  );
}
HBar.propTypes = { label: PropTypes.string, value: PropTypes.number, max: PropTypes.number, color: PropTypes.string, suffix: PropTypes.string, avatar: PropTypes.any };

function Sparkline({ data, height = 40, color = '#6366f1' }) {
  const values = Object.values(data || {});
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 280;
  const h = height;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`).join(' ');
  const area    = `0,${h} ` + points + ` ${(values.length - 1) * step},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spark-fill)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
Sparkline.propTypes = { data: PropTypes.object, height: PropTypes.number, color: PropTypes.string };

function DonutStat({ segments, size = 80 }) {
  const total = Object.values(segments).reduce((s, v) => s + v, 0);
  if (total === 0) return <div style={{ width: size, height: size }} className="rounded-full bg-muted" />;
  const colors = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];
  let offset = 0;
  const slices = Object.entries(segments).map(([k, v], i) => {
    const pct = (v / total) * 100;
    const slice = { key: k, pct, offset, color: colors[i % colors.length] };
    offset += pct;
    return slice;
  });
  const gradient = slices.map((s) => `${s.color} ${s.offset.toFixed(1)}% ${(s.offset + s.pct).toFixed(1)}%`).join(', ');
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: `conic-gradient(${gradient})`,
      }}
    />
  );
}
DonutStat.propTypes = { segments: PropTypes.object, size: PropTypes.number };

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color = 'text-indigo-500', trend }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60">
            <Icon className={cn('h-5 w-5', color)} />
          </div>
          {trend !== undefined && (
            trend >= 0
              ? <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-semibold"><TrendingUp className="h-3 w-3" />+{trend}%</span>
              : <span className="flex items-center gap-0.5 text-xs text-red-500 font-semibold"><TrendingDown className="h-3 w-3" />{trend}%</span>
          )}
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">{value ?? '—'}</p>
        <p className="text-xs font-medium text-foreground/80">{label}</p>
        {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
KpiCard.propTypes = { icon: PropTypes.any, label: PropTypes.string, value: PropTypes.any, sub: PropTypes.string, color: PropTypes.string, trend: PropTypes.number };

// ── Anomaly alert ─────────────────────────────────────────────────────────────

function AnomalyAlert({ icon: Icon, title, description, severity = 'warning' }) {
  const colors = {
    warning:  'bg-amber-50 border-amber-200 text-amber-800',
    critical: 'bg-red-50 border-red-200 text-red-800',
    info:     'bg-blue-50 border-blue-200 text-blue-800',
  };
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn('flex items-start gap-3 rounded-xl border p-3', colors[severity])}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs mt-0.5 opacity-80">{description}</p>
      </div>
    </motion.div>
  );
}
AnomalyAlert.propTypes = { icon: PropTypes.any, title: PropTypes.string, description: PropTypes.string, severity: PropTypes.string };

// ── Analytics Dashboard ───────────────────────────────────────────────────────

function AnalyticsDashboard({ onExportPdf }) {
  const { data, isLoading } = useQuery({
    queryKey: ['activity-analytics'],
    queryFn: () => api.get('/activity/analytics').then((r) => r.data),
    staleTime: 300_000,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return null;

  const { kpis, top_users, by_module, trend_28d, unstable_tasks, inactive_users, spikes, collaboration_score } = data;
  const maxUser  = Math.max(...(top_users?.map((u) => u.count) || [1]), 1);
  const maxModule = Math.max(...Object.values(by_module || {}), 1);

  const anomalies = [
    ...(unstable_tasks?.map((t) => ({
      icon: Flame,
      title: `Tâche instable : "${t.title}"`,
      description: `${t.update_count} modifications en 7 jours — tâche potentiellement bloquée.`,
      severity: t.risk_level,
    })) || []),
    ...(spikes?.map((s) => ({
      icon: Zap,
      title: `Pic d'activité détecté le ${new Date(s.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`,
      description: `${s.count} actions (moyenne habituelle : ${s.avg}).`,
      severity: 'warning',
    })) || []),
    ...(inactive_users?.map((u) => ({
      icon: UserX,
      title: `Membre inactif : ${u.name}`,
      description: 'Aucune activité enregistrée depuis plus de 14 jours.',
      severity: 'info',
    })) || []),
  ];

  return (
    <div className="space-y-6">
      {/* Export PDF button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onExportPdf}>
          <FileText className="h-3.5 w-3.5" />
          Exporter en PDF
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Activity}      label="Actions (30j)"       value={kpis?.total_30d}       color="text-indigo-500" />
        <KpiCard icon={BarChart2}     label="Actions (7j)"        value={kpis?.total_7d}         color="text-blue-500" />
        <KpiCard icon={AlertCircle}   label="Événements critiques" value={kpis?.critical_7d}    color="text-red-500" />
        <KpiCard icon={Users}         label="Utilisateurs actifs"  value={kpis?.unique_users_7d} color="text-emerald-500" sub="Cette semaine" />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top users */}
        <Card className="lg:col-span-1">
          <CardContent className="p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Top utilisateurs (30j)</p>
            <div className="space-y-2.5">
              {top_users?.length > 0
                ? top_users.map((u) => <HBar key={u.user_id} label={u.name} value={u.count} max={maxUser} color="bg-indigo-500" avatar={u.avatar_url} />)
                : <p className="text-xs text-muted-foreground">Aucune donnée</p>}
            </div>
          </CardContent>
        </Card>

        {/* Trend sparkline */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-foreground">Tendance activité — 28 jours</p>
              <span className="text-xs text-muted-foreground">{Object.values(trend_28d || {}).reduce((a, b) => a + b, 0)} actions</span>
            </div>
            <Sparkline data={trend_28d} height={56} color="#6366f1" />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">
                {Object.keys(trend_28d || {})[0] ? new Date(Object.keys(trend_28d)[0]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
              </span>
              <span className="text-[10px] text-muted-foreground">Aujourd'hui</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module distribution */}
      <Card>
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">Répartition par module</p>
          <div className="flex items-center gap-6 flex-wrap">
            <DonutStat segments={by_module || {}} size={88} />
            <div className="space-y-2 flex-1">
              {Object.entries(by_module || {}).map(([mod, count]) => (
                <HBar
                  key={mod}
                  label={mod === 'task' ? 'Tâches' : mod === 'project' ? 'Projets' : mod}
                  value={count}
                  max={maxModule}
                  color={MODULE_COLORS[mod] ?? 'bg-slate-500'}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collaboration score */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/40" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#6366f1" strokeWidth="3"
                  strokeDasharray={`${collaboration_score} ${100 - collaboration_score}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                {collaboration_score}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground">Score de collaboration</p>
              <p className="text-sm text-muted-foreground">
                {collaboration_score >= 70 ? `Excellente collaboration d'équipe.`
                  : collaboration_score >= 40 ? `Collaboration modérée — encourager les interactions.`
                  : `Faible collaboration — peu d'actions communes détectées.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart anomalies */}
      {anomalies.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-amber-500" />
            Détections intelligentes ({anomalies.length})
          </p>
          <div className="space-y-2">
            {anomalies.map((a, i) => <AnomalyAlert key={i} {...a} />)}
          </div>
        </div>
      )}
    </div>
  );
}
AnalyticsDashboard.propTypes = { onExportPdf: PropTypes.func };

// ── Before/After diff row ─────────────────────────────────────────────────────

function BeforeAfterRow({ row }) {
  if (!row.hasChange) {
    return (
      <li className="flex flex-wrap items-baseline gap-2 text-sm py-0.5">
        <span className="shrink-0 text-xs font-medium text-muted-foreground w-32">{row.label}</span>
        {row.kind === 'workflow' ? (
          <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', workflowBadgeClass(row.raw))}>{row.value}</span>
        ) : row.kind === 'priority' ? (
          <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', priorityBadgeClass(row.raw))}>{row.value}</span>
        ) : (
          <span className="font-medium text-foreground">{row.value}</span>
        )}
      </li>
    );
  }
  return (
    <li className="flex flex-wrap items-baseline gap-1.5 text-sm py-0.5">
      <span className="shrink-0 text-xs font-medium text-muted-foreground w-32">{row.label}</span>
      <span className="line-through text-muted-foreground/70 text-xs">{row.oldValue}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
      {row.kind === 'workflow' ? (
        <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', workflowBadgeClass(row.raw))}>{row.value}</span>
      ) : row.kind === 'priority' ? (
        <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', priorityBadgeClass(row.raw))}>{row.value}</span>
      ) : (
        <span className="font-semibold text-foreground">{row.value}</span>
      )}
    </li>
  );
}
BeforeAfterRow.propTypes = { row: PropTypes.object };

// ── Single activity row ───────────────────────────────────────────────────────

function ActivityRow({ a, idx, isNew = false }) {
  const [expanded, setExpanded] = useState(false);
  const meta       = a.meta || {};
  const actorName  = a.actor?.name || 'Système';
  const headline   = getActivityHeadline(a.action, meta, a.actor?.name ?? null);
  const detailRows = getActivityDetailRows(a.action, meta, a.old_values, a.new_values);
  const iconName   = getActivityIconName(a.action);
  const Icon       = ICON_MAP[iconName] || History;
  const category   = getActionCategory(a.action);
  const catCfg     = ACTION_CATEGORIES[category];
  const severity   = a.severity ?? 'info';
  const sevCfg     = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;
  const SevIcon    = sevCfg.icon;

  return (
    <motion.li
      initial={isNew ? { opacity: 0, y: -8, scale: 0.98 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: isNew ? 0 : Math.min(idx * 0.012, 0.25), duration: 0.2 }}
      className={cn(
        'group relative rounded-xl border bg-card shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden',
        isNew && 'ring-2 ring-indigo-400/60',
        severity === 'critical' && 'border-red-200 dark:border-red-900/40',
        severity === 'warning'  && 'border-amber-200 dark:border-amber-900/40',
      )}
    >
      <div className={cn('absolute left-0 top-0 bottom-0 w-0.5', sevCfg.color)} />
      <div className="flex gap-3 p-4 pl-5">
        <div className="relative shrink-0 mt-0.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card', catCfg?.color)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-medium text-sm leading-snug text-foreground">{headline}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              {severity !== 'info' && (
                <span className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold', sevCfg.bg, sevCfg.text)}>
                  <SevIcon className="h-2.5 w-2.5" />{sevCfg.label}
                </span>
              )}
              <time className="text-xs tabular-nums text-muted-foreground whitespace-nowrap" dateTime={a.created_at}>
                {a.created_at ? new Date(a.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
              </time>
            </div>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <UserAvatar name={actorName} src={a.actor?.avatar_url} size="sm" className="shrink-0 !h-5 !w-5" />
              <span className="font-medium text-foreground/80">{actorName}</span>
              {a.actor_role && <span className="text-muted-foreground/60">· {a.actor_role}</span>}
            </span>
            {a.project_name && (
              <span className="flex items-center gap-1"><FolderKanban className="h-3 w-3" />{a.project_name}</span>
            )}
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white', catCfg?.color)}>
              {catCfg?.label}
            </span>
          </div>

          {detailRows.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
                {expanded ? 'Masquer' : `Détails (${detailRows.length})`}
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="mt-2 space-y-0.5 border-t border-border/50 pt-2 overflow-hidden"
                  >
                    {detailRows.map((row) => <BeforeAfterRow key={`${a.id}-${row.key}`} row={row} />)}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.li>
  );
}
ActivityRow.propTypes = { a: PropTypes.object, idx: PropTypes.number, isNew: PropTypes.bool };

// ── Stats chips ───────────────────────────────────────────────────────────────

function StatsBar({ stats, moduleFilter, setModuleFilter, severityFilter, setSeverityFilter }) {
  if (!stats) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground">
        <Activity className="h-3.5 w-3.5 text-indigo-500" />
        {stats.total ?? 0} entrées
      </div>
      {Object.entries(stats.by_module || {}).map(([mod, count]) => (
        <button key={mod} type="button"
          onClick={() => setModuleFilter(moduleFilter === mod ? '' : mod)}
          className={cn('rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
            moduleFilter === mod ? 'border-indigo-400 bg-indigo-600 text-white' : 'border-border bg-card text-muted-foreground hover:text-foreground')}
        >
          {mod === 'task' ? 'Tâches' : mod === 'project' ? 'Projets' : mod} · {count}
        </button>
      ))}
      {Object.entries(stats.by_severity || {}).filter(([k]) => k !== 'info').map(([sev, count]) => {
        const cfg = SEVERITY_CONFIG[sev];
        if (!cfg) return null;
        return (
          <button key={sev} type="button"
            onClick={() => setSeverityFilter(severityFilter === sev ? '' : sev)}
            className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
              severityFilter === sev ? `border-transparent ${cfg.color} text-white` : `border-border bg-card ${cfg.text} hover:border-current`)}
          >
            {count} {cfg.label}
          </button>
        );
      })}
    </div>
  );
}
StatsBar.propTypes = { stats: PropTypes.object, moduleFilter: PropTypes.string, setModuleFilter: PropTypes.func, severityFilter: PropTypes.string, setSeverityFilter: PropTypes.func };

// ── Mini heatmap ─────────────────────────────────────────────────────────────

function ActivityHeatmap({ last7Days }) {
  if (!last7Days || Object.keys(last7Days).length === 0) return null;
  const entries = Object.entries(last7Days);
  const maxCount = Math.max(...entries.map(([, v]) => Number(v)), 1);
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold text-muted-foreground mb-3">Activité · 7 jours</p>
      <div className="flex items-end gap-1.5 h-12">
        {entries.map(([day, count]) => {
          const pct = (Number(count) / maxCount) * 100;
          const label = new Date(day).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-1" title={`${label} : ${count}`}>
              <div className="w-full rounded-sm bg-indigo-500/70 hover:bg-indigo-500 transition-colors" style={{ height: `${Math.max(pct, 4)}%` }} />
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
ActivityHeatmap.propTypes = { last7Days: PropTypes.object };

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const loadMoreRef   = useRef(null);
  const { user }        = useAuth();
  const isAdmin         = user?.roles?.includes('admin');
  // Chef de projet dans au moins un projet → accès aux analytics d'audit de ses projets
  const isChefSomewhere = user?.is_chef_somewhere ?? false;
  const canSeeAnalytics = isAdmin || isChefSomewhere;

  const [activeTab,      setActiveTab]      = useState('timeline');
  const [search,         setSearch]         = useState('');
  const [moduleFilter,   setModuleFilter]   = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');
  const [showFilters,    setShowFilters]    = useState(false);
  const [newIds,         setNewIds]         = useState(new Set());
  const [liveCount,      setLiveCount]      = useState(0);

  // Reset audit badge on open
  useEffect(() => {
    localStorage.setItem('audit_last_visit', new Date().toISOString());
    queryClient.invalidateQueries({ queryKey: ['audit-badge'] });
  }, [queryClient]);

  const params = useMemo(() => {
    const p = { per_page: 30 };
    if (moduleFilter)   p.module    = moduleFilter;
    if (severityFilter) p.severity  = severityFilter;
    if (dateFrom)       p.date_from = dateFrom;
    if (dateTo)         p.date_to   = dateTo;
    if (search.trim())  p.search    = search.trim();
    return p;
  }, [moduleFilter, severityFilter, dateFrom, dateTo, search]);

  const {
    data, isLoading, isError, error,
    fetchNextPage, hasNextPage, isFetchingNextPage, refetch,
  } = useInfiniteQuery({
    queryKey: ['audit-log-enterprise', params],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/activity/feed', { params: { ...params, page: pageParam } }).then((r) => r.data),
    getNextPageParam: (last) =>
      last.meta?.current_page < last.meta?.last_page ? last.meta.current_page + 1 : undefined,
    staleTime: 30_000,
    enabled: activeTab === 'timeline',
  });

  const { data: statsData } = useQuery({
    queryKey: ['audit-log-stats'],
    queryFn: () => api.get('/activity/feed', { params: { per_page: 1, with_stats: 1 } }).then((r) => r.data.stats),
    staleTime: 60_000,
  });

  const activities = useMemo(() => {
    const pages = data?.pages ?? [];
    return pages.flatMap((p) => {
      const raw = p?.activities?.data ?? p?.activities ?? p?.data ?? [];
      return Array.isArray(raw) ? raw : [];
    });
  }, [data]);

  const grouped = useMemo(() => groupActivitiesByDate(activities), [activities]);

  // Infinite scroll
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // WebSocket real-time
  const handleNewActivity = useCallback((e) => {
    const newLog = e.activity;
    if (!newLog) return;
    setLiveCount((c) => c + 1);
    setNewIds((prev) => new Set([...prev, newLog.id]));
    queryClient.setQueryData(['audit-log-enterprise', params], (old) => {
      if (!old) return old;
      const pages = old.pages ? [...old.pages] : [];
      if (!pages.length) return old;
      const firstPage = pages[0];
      const existing = firstPage?.activities?.data ?? firstPage?.activities ?? firstPage?.data ?? [];
      return {
        ...old,
        pages: [{ ...firstPage, activities: { ...firstPage.activities, data: [newLog, ...existing] } }, ...pages.slice(1)],
      };
    });
    setTimeout(() => setNewIds((prev) => { const n = new Set(prev); n.delete(newLog.id); return n; }), 4000);
  }, [queryClient, params]);

  useEffect(() => {
    const projectIds = [...new Set(activities.map((a) => a.project_id).filter(Boolean))];
    if (!projectIds.length) return;
    const echo = getEcho();
    const channels = projectIds.map((pid) => {
      const ch = echo.private(`project.${pid}`);
      ch.listen('.activity.logged', handleNewActivity);
      return ch;
    });
    return () => channels.forEach((ch) => ch.stopListening('.activity.logged'));
  }, [activities, handleNewActivity]);

  // PDF export — opens print-ready page in new tab
  const handleExportPdf = () => {
    const query = new URLSearchParams(params).toString();
    window.open(`/audit-log/report?${query}`, '_blank');
  };

  const resetFilters = () => {
    setSearch(''); setModuleFilter(''); setSeverityFilter('');
    setDateFrom(''); setDateTo('');
  };
  const hasFilters = search || moduleFilter || severityFilter || dateFrom || dateTo;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-indigo-500/[0.04] p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/8 blur-3xl" />
        <div className="relative flex flex-wrap items-start gap-4">
          <button type="button" onClick={() => navigate(-1)}
            className="mt-1 rounded-md p-1 hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-600 shadow-inner">
            <History className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Journal d'audit</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Observabilité complète · Analytics · Détection intelligente
            </p>
          </div>
          {liveCount > 0 && (
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1.5 text-xs font-semibold text-emerald-600">
              <Wifi className="h-3 w-3 animate-pulse" />{liveCount} nouveau{liveCount > 1 ? 'x' : ''}
            </span>
          )}
        </div>

        {/* Tab switcher — Analytics : admin + chefs de projet */}
        <div className="relative mt-5 flex gap-1 rounded-xl bg-muted/50 p-1 w-fit">
          {[
            { key: 'timeline',  label: 'Timeline',  icon: History,   visible: true },
            { key: 'analytics', label: 'Analytics', icon: BarChart2, visible: canSeeAnalytics },
          ].filter((t) => t.visible).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150',
                activeTab === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── ANALYTICS TAB — admin + chefs ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'analytics' && canSeeAnalytics && (
          <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <AnalyticsDashboard onExportPdf={handleExportPdf} />
          </motion.div>
        )}

        {/* ── TIMELINE TAB ── */}
        {activeTab === 'timeline' && (
          <motion.div key="timeline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="space-y-4">
            {/* Stats + heatmap */}
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <StatsBar stats={statsData} moduleFilter={moduleFilter} setModuleFilter={setModuleFilter} severityFilter={severityFilter} setSeverityFilter={setSeverityFilter} />
              <ActivityHeatmap last7Days={statsData?.last_7_days} />
            </div>

            {/* Filter bar */}
            <Card>
              <CardContent className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[220px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input type="text"
                      className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      placeholder="Rechercher par action, acteur, tâche…"
                      value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <div className="w-36">
                    <Select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="h-9 text-sm">
                      <option value="">Tous les modules</option>
                      {MODULES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </Select>
                  </div>
                  <button type="button" onClick={() => setShowFilters((v) => !v)}
                    className={cn('flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors',
                      showFilters ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-border text-muted-foreground hover:text-foreground')}>
                    <Filter className="h-3.5 w-3.5" />Dates
                    <ChevronDown className={cn('h-3 w-3 transition-transform', showFilters && 'rotate-180')} />
                  </button>
                  {hasFilters && (
                    <button type="button" onClick={resetFilters}
                      className="flex items-center gap-1 rounded-md px-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <RotateCcw className="h-3.5 w-3.5" />Réinitialiser
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {showFilters && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                      <div className="flex flex-wrap items-center gap-3 pt-3 mt-3 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">Du</span>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
                        <span className="text-xs text-muted-foreground">au</span>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Timeline */}
            {isLoading ? (
              <div className="flex justify-center py-20"><Spinner size="lg" /></div>
            ) : isError ? (
              <Card className="border-destructive/40 bg-destructive/5">
                <CardContent className="py-10 text-center text-sm">
                  <p className="font-medium text-destructive">Impossible de charger le journal</p>
                  <p className="mt-2 text-muted-foreground">{error?.response?.data?.message || 'Erreur réseau.'}</p>
                  <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>Réessayer</Button>
                </CardContent>
              </Card>
            ) : activities.length === 0 ? (
              <EmptyState icon={History} title="Aucune entrée" description="Aucune activité pour ces filtres.">
                {hasFilters && <Button type="button" variant="outline" onClick={resetFilters}>Effacer les filtres</Button>}
              </EmptyState>
            ) : (
              <div className="space-y-6">
                {grouped.map((group) => (
                  <div key={group.date}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</span>
                      <div className="flex-1 h-px bg-border/50" />
                      <span className="text-xs text-muted-foreground tabular-nums">{group.items.length}</span>
                    </div>
                    <ul className="space-y-2.5">
                      {group.items.map((a, idx) => (
                        <ActivityRow key={a.id ?? idx} a={a} idx={idx} isNew={newIds.has(a.id)} />
                      ))}
                    </ul>
                  </div>
                ))}
                <div ref={loadMoreRef} className="flex justify-center py-4">
                  {isFetchingNextPage ? <Spinner size="sm" />
                    : hasNextPage ? (
                      <button type="button" onClick={() => fetchNextPage()} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Charger plus</button>
                    ) : (
                      <p className="text-xs text-muted-foreground">Toutes les entrées ont été chargées.</p>
                    )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
