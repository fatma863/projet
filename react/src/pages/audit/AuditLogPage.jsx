import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { Select } from '../../components/ui/Select';
import {
  History, ArrowLeft, Filter, RotateCcw, Search,
  Pencil, Plus, Trash2, LayoutGrid, MessageSquare, Clock,
  Link2, Users, FolderKanban, User,
} from 'lucide-react';
import {
  getActivityHeadline,
  getActivityDetailRows,
  getActivityIconName,
} from '../../lib/projectActivityHumanize';
import { cn } from '../../lib/utils';

const ICON_MAP = {
  pencil: Pencil, plus: Plus, trash: Trash2, layout: LayoutGrid,
  message: MessageSquare, clock: Clock, link: Link2,
  users: Users, folder: FolderKanban, user: User, activity: History,
};

const ACTION_CATEGORIES = {
  created: { label: 'Créations', color: 'bg-emerald-500' },
  updated: { label: 'Modifications', color: 'bg-blue-500' },
  deleted: { label: 'Suppressions', color: 'bg-red-500' },
  moved: { label: 'Déplacements', color: 'bg-amber-500' },
  commented: { label: 'Commentaires', color: 'bg-teal-500' },
  assigned: { label: 'Assignations', color: 'bg-indigo-500' },
};

function getActionCategory(action) {
  const a = String(action || '').toLowerCase();
  if (a.includes('creat') || a.includes('added') || a.includes('ajout')) return 'created';
  if (a.includes('delet') || a.includes('remov') || a.includes('suppri')) return 'deleted';
  if (a.includes('mov') || a.includes('depla') || a.includes('transfer')) return 'moved';
  if (a.includes('comment')) return 'commented';
  if (a.includes('assign')) return 'assigned';
  if (a.includes('updat') || a.includes('modif') || a.includes('edit') || a.includes('chang')) return 'updated';
  return 'updated';
}

function ActivityRow({ a, idx }) {
  const meta = a.meta || {};
  const headline = getActivityHeadline(a.action, meta);
  const detailRows = getActivityDetailRows(a.action, meta);
  const iconName = getActivityIconName(a.action);
  const Icon = ICON_MAP[iconName] || History;
  const actorName = a.actor?.name || 'Système';
  const category = getActionCategory(a.action);
  const catCfg = ACTION_CATEGORIES[category];

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.015, 0.3), duration: 0.22 }}
      className="flex gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Icon */}
      <div className="relative shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card', catCfg?.color ?? 'bg-slate-400')}
          title={catCfg?.label}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-medium leading-snug text-foreground">{headline}</p>
          <time className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground" dateTime={a.created_at}>
            {a.created_at ? new Date(a.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
          </time>
        </div>

        {/* Actor + project */}
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <UserAvatar name={actorName} size="sm" className="shrink-0 !h-5 !w-5" />
            {actorName}
          </span>
          {a.project_name && (
            <span className="flex items-center gap-1">
              <FolderKanban className="h-3 w-3" />
              {a.project_name}
            </span>
          )}
          {catCfg && (
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold text-white', catCfg.color)}>
              {catCfg.label}
            </span>
          )}
        </div>

        {/* Detail rows */}
        {detailRows.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
            {detailRows.map((row) => (
              <li key={`${a.id}-${row.key}`} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3 text-sm">
                <span className="shrink-0 text-xs font-medium text-muted-foreground sm:w-36">{row.label}</span>
                <span className="font-medium text-foreground">{row.value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.li>
  );
}

export default function AuditLogPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [perPage] = useState(100);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['audit-log', perPage],
    queryFn: () => api.get('/activity/feed', { params: { per_page: perPage } }).then((r) => r.data),
    staleTime: 30000,
  });

  const items = useMemo(() => {
    const raw = data?.activities?.data ?? data?.activities ?? data?.data ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  const filtered = useMemo(() => {
    let list = items;
    if (actionFilter) {
      list = list.filter((a) => getActionCategory(a.action) === actionFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) => {
        const headline = getActivityHeadline(a.action, a.meta || '');
        return (
          String(headline).toLowerCase().includes(q) ||
          String(a.actor?.name || '').toLowerCase().includes(q) ||
          String(a.project_name || '').toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [items, actionFilter, search]);

  // Category counts
  const counts = useMemo(() => {
    const c = {};
    items.forEach((a) => {
      const cat = getActionCategory(a.action);
      c[cat] = (c[cat] || 0) + 1;
    });
    return c;
  }, [items]);

  const resetFilters = () => { setSearch(''); setActionFilter(''); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.04] p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/8 blur-3xl" />
        <div className="relative flex flex-wrap items-start gap-4">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="mt-1 rounded-md p-1 hover:bg-accent"
            aria-label="Retour aux paramètres"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner">
            <History className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Journal d'audit</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Historique complet des actions sur les projets, tâches et membres de l'application.
            </p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {!isLoading && items.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(ACTION_CATEGORIES).map(([key, cfg]) => {
            const count = counts[key] || 0;
            if (!count) return null;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActionFilter(actionFilter === key ? '' : key)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                  actionFilter === key
                    ? 'border-transparent bg-foreground text-background shadow-sm'
                    : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', cfg.color)} />
                {cfg.label}
                <span className="tabular-nums">{count}</span>
              </button>
            );
          })}
          <span className="ml-auto text-xs text-muted-foreground self-center">
            {filtered.length} / {items.length} entrées
          </span>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filtres
          </div>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground"
              placeholder="Rechercher par action, acteur, projet…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="min-w-[160px]">
            <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="">Toutes les actions</option>
              {Object.entries(ACTION_CATEGORIES).map(([k, c]) => (
                <option key={k} value={k}>{c.label}</option>
              ))}
            </Select>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={resetFilters}>
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : isError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-10 text-center text-sm">
            <p className="font-medium text-destructive">Impossible de charger le journal</p>
            <p className="mt-2 text-muted-foreground">
              {error?.response?.data?.message || error?.message || 'Erreur réseau ou serveur.'}
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="Aucune entrée"
          description={search || actionFilter ? 'Aucun résultat pour ces filtres.' : 'Le journal d\'audit est vide.'}
        >
          {(search || actionFilter) && (
            <Button type="button" variant="outline" onClick={resetFilters}>Effacer les filtres</Button>
          )}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {filtered.map((a, idx) => (
            <ActivityRow key={a.id ?? idx} a={a} idx={idx} />
          ))}
        </ul>
      )}
    </div>
  );
}
