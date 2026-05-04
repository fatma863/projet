import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Spinner } from '../ui/Spinner';
import {
  X, CheckCircle2, AlertTriangle, TrendingUp, Clock,
  Zap, Award, ChevronDown, ChevronRight, UserCheck, BarChart3,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};
const PRIORITY_LABELS = { urgent: 'Urgente', high: 'Haute', medium: 'Moyenne', low: 'Basse' };

function sc(s) {
  if (s >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (s >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-500 dark:text-rose-400';
}
function scBg(s) {
  if (s >= 75) return 'bg-emerald-500';
  if (s >= 50) return 'bg-amber-500';
  return 'bg-rose-400';
}
function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(String(v).slice(0, 10));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}
function initials(name) {
  return (name ?? '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

// ---------------------------------------------------------------------------
// Stat pill
// ---------------------------------------------------------------------------

function Pill({ label, value, color = 'default', icon: Icon }) {
  const cls = {
    default: 'bg-muted/60 text-foreground',
    green:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    amber:   'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    blue:    'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    rose:    'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
    violet:  'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300',
  };
  return (
    <div className={`flex flex-col items-center rounded-xl px-3 py-2 ${cls[color]}`}>
      {Icon && <Icon className="mb-0.5 h-3 w-3 opacity-70" />}
      <span className="text-sm font-bold tabular-nums">{value ?? '—'}</span>
      <span className="text-[9px] font-medium opacity-75 text-center leading-tight">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score bar
// ---------------------------------------------------------------------------

function ScoreBar({ score, size = 'md' }) {
  const w = size === 'sm' ? 'w-16' : 'w-24';
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-1.5 ${w} overflow-hidden rounded-full bg-muted`}>
        <div className={`h-full rounded-full ${scBg(score)}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold tabular-nums ${sc(score)}`}>{score}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Member sidebar item
// ---------------------------------------------------------------------------

function MemberItem({ member, isSelected, isAssigned, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all ${
        isSelected
          ? 'bg-primary/10 border border-primary/30'
          : 'hover:bg-muted/50 border border-transparent'
      }`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        isAssigned ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {isAssigned ? <UserCheck className="h-4 w-4" /> : initials(member.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`truncate text-xs font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
          {member.name}
        </p>
        <ScoreBar score={member.performance_score} size="sm" />
      </div>
      {isAssigned && (
        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
          assigné
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Member detail panel
// ---------------------------------------------------------------------------

function MemberDetail({ member, isAssigned, onAssign }) {
  const [histOpen, setHistOpen] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-5 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20 text-base font-bold text-primary">
            {initials(member.name)}
          </div>
          <div>
            <p className="font-semibold text-foreground">{member.name}</p>
            <p className="text-xs text-muted-foreground">{member.email}</p>
            {member.specialties?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {member.specialties.map(s => (
                  <span
                    key={s.id}
                    className="rounded-full px-2 py-0.5 text-[9px] font-medium text-white"
                    style={{ backgroundColor: s.color || '#6366f1' }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Score ring-like badge */}
        <div className="flex flex-col items-center">
          <div className={`text-3xl font-black tabular-nums ${sc(member.performance_score)}`}>
            {member.performance_score}
          </div>
          <span className="text-[9px] text-muted-foreground">score</span>
          <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${scBg(member.performance_score)}`}
              style={{ width: `${member.performance_score}%` }} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Pill icon={CheckCircle2} label="Terminées"  value={`${member.tasks_done}/${member.tasks_total}`} color="green" />
          <Pill icon={Zap}          label="En cours"   value={member.tasks_active} color={member.tasks_active > 3 ? 'rose' : 'default'} />
          <Pill icon={Clock}        label="À faire"    value={member.tasks_todo} color="default" />
          {member.avg_actual_hours   != null && <Pill label="Moy. heures"   value={`${member.avg_actual_hours}h`}   color="blue" />}
          {member.avg_days_to_complete != null && (
            <Pill icon={TrendingUp} label="Délai moy." value={`${member.avg_days_to_complete}j`} color="blue" />
          )}
          {member.on_time_rate       != null && (
            <Pill label="À temps" value={`${member.on_time_rate}%`}
              color={member.on_time_rate >= 70 ? 'green' : member.on_time_rate >= 40 ? 'amber' : 'rose'} />
          )}
          {member.hours_accuracy     != null && (
            <Pill label="Précision H." value={`${member.hours_accuracy}%`}
              color={member.hours_accuracy >= 80 ? 'green' : 'amber'} />
          )}
          <Pill icon={Zap} label="Vélocité 30j" value={member.velocity_30d} color="violet" />
        </div>

        {/* Priority breakdown */}
        {member.done_by_priority && Object.values(member.done_by_priority).some(v => v > 0) && (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tâches terminées par priorité
            </p>
            <div className="flex flex-wrap gap-2">
              {['urgent', 'high', 'medium', 'low'].map(p =>
                member.done_by_priority[p] > 0 && (
                  <span key={p} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_COLORS[p]}`}>
                    {PRIORITY_LABELS[p]} · {member.done_by_priority[p]}
                  </span>
                )
              )}
            </div>
          </div>
        )}

        {/* Task history */}
        {member.tasks_list?.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setHistOpen(v => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors"
            >
              <span>Historique des {member.tasks_list.length} dernières tâches terminées</span>
              {histOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>

            {histOpen && (
              <div className="mt-2 overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      {['Tâche', 'Priorité', 'Début prévu', 'Fin prévue', 'H.est.', 'H.réel', 'Terminée le'].map(h => (
                        <th key={h} className="px-2 py-1.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {member.tasks_list.map(t => {
                      const hoursOk = t.estimated_hours && t.actual_hours
                        ? t.actual_hours <= t.estimated_hours * 1.2 : null;
                      return (
                        <tr key={t.id} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="px-2 py-1.5 font-medium text-foreground max-w-[140px] truncate">{t.title}</td>
                          <td className="px-2 py-1.5">
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${PRIORITY_COLORS[t.priority] ?? ''}`}>
                              {PRIORITY_LABELS[t.priority] ?? t.priority}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{fmtDate(t.planned_start)}</td>
                          <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{fmtDate(t.planned_end)}</td>
                          <td className="px-2 py-1.5 text-right text-muted-foreground">
                            {t.estimated_hours != null ? `${t.estimated_hours}h` : '—'}
                          </td>
                          <td className={`px-2 py-1.5 text-right font-medium ${
                            hoursOk === true ? 'text-emerald-600 dark:text-emerald-400' :
                            hoursOk === false ? 'text-rose-500' : 'text-muted-foreground'
                          }`}>
                            {t.actual_hours != null ? `${t.actual_hours}h` : '—'}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{fmtDate(t.completed_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {member.tasks_list?.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">Aucune tâche terminée dans ce projet.</p>
        )}
      </div>

      {/* Assign button */}
      <div className="mt-auto border-t border-border p-4">
        <button
          type="button"
          onClick={() => onAssign(member.id)}
          disabled={isAssigned}
          className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
            isAssigned
              ? 'bg-primary/10 text-primary cursor-default'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          {isAssigned ? 'Déjà assigné' : `Assigner ${member.name.split(' ')[0]}`}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

export function MembersPerformanceModal({ open, onClose, projectId, assigneeId, onAssign }) {
  const [selectedId, setSelectedId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['members-performance', projectId],
    queryFn: () => api.get(`/projects/${projectId}/members-performance`).then(r => r.data),
    enabled: open && Boolean(projectId),
  });

  const members = data?.members ?? [];

  // Default selection: assigned member first, else first in list
  const effectiveSelected = selectedId
    ?? (assigneeId ? members.find(m => String(m.id) === String(assigneeId))?.id : null)
    ?? members[0]?.id
    ?? null;

  const selectedMember = members.find(m => m.id === effectiveSelected) ?? null;

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.currentTarget === e.target) onClose(); }}
    >
      <div className="relative flex w-full max-w-4xl flex-col rounded-2xl border border-border bg-card shadow-2xl max-h-[calc(100dvh-3rem)] animate-in fade-in-0 zoom-in-[0.97] duration-200 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/5 to-transparent px-5 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Performance des membres</p>
              <p className="text-[11px] text-muted-foreground">
                {members.length} membre{members.length !== 1 ? 's' : ''} · Cliquez sur un membre pour voir ses détails
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <p className="font-medium text-foreground">Aucun membre dans ce projet</p>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Left: member list */}
            <div className="w-52 shrink-0 border-r border-border/60 overflow-y-auto p-2 space-y-0.5 bg-muted/10">
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Membres ({members.length})
              </p>
              {members.map((m, idx) => (
                <MemberItem
                  key={m.id}
                  member={m}
                  isSelected={m.id === effectiveSelected}
                  isAssigned={String(m.id) === String(assigneeId)}
                  onClick={() => setSelectedId(m.id)}
                />
              ))}
            </div>

            {/* Right: detail */}
            <div className="flex-1 overflow-hidden">
              {selectedMember ? (
                <MemberDetail
                  member={selectedMember}
                  isAssigned={String(selectedMember.id) === String(assigneeId)}
                  onAssign={(id) => {
                    onAssign(id);
                    onClose();
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  Sélectionnez un membre
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
