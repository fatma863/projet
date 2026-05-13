import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../../components/ui/Spinner';
import {
  ArrowLeft, ChevronDown, ChevronRight, TrendingUp, Clock,
  CheckCircle2, AlertTriangle, Zap, Star, Award, BarChart3,
  Target, Shield, Activity,
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

function scoreColor(s) {
  if (s >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (s >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-500 dark:text-rose-400';
}
function scoreBg(s) {
  if (s >= 75) return 'bg-emerald-500';
  if (s >= 50) return 'bg-amber-500';
  return 'bg-rose-400';
}

function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(String(v).slice(0, 10));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR');
}

function Stat({ label, value, color = 'default', icon: Icon }) {
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
      {Icon && <Icon className="mb-0.5 h-3.5 w-3.5 opacity-70" />}
      <span className="text-sm font-bold tabular-nums">{value ?? '—'}</span>
      <span className="text-[9px] font-medium opacity-75 text-center leading-tight">{label}</span>
    </div>
  );
}

function ScoreBar({ score }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${scoreBg(score)}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`w-9 text-right text-sm font-bold tabular-nums ${scoreColor(score)}`}>{score}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Member row
// ---------------------------------------------------------------------------

function MemberRow({ member, rank }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Main row */}
      <tr
        className="cursor-pointer border-b border-border/50 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        {/* Rank */}
        <td className="px-3 py-3 text-center">
          {rank === 1 ? (
            <Award className="h-5 w-5 text-amber-500 mx-auto" />
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">{rank}</span>
          )}
        </td>

        {/* Member info */}
        <td className="px-3 py-3">
          <div className="flex items-center gap-3">
            {member.avatar_url ? (
              <img src={member.avatar_url} alt={member.name} className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-background" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                {(member.name || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium text-foreground text-sm">{member.name}</p>
              <p className="text-[10px] text-muted-foreground">{member.email}</p>
              {member.specialties?.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {member.specialties.map(s => (
                    <span
                      key={s.id}
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-medium text-white"
                      style={{ backgroundColor: s.color || '#6366f1' }}
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Score */}
        <td className="px-3 py-3">
          <ScoreBar score={member.performance_score} />
        </td>

        {/* Tasks done / total */}
        <td className="px-3 py-3 text-center">
          <span className="text-sm font-semibold text-foreground">{member.tasks_done}</span>
          <span className="text-muted-foreground text-xs">/{member.tasks_total}</span>
        </td>

        {/* Active tasks */}
        <td className="px-3 py-3 text-center">
          <span className={`text-sm font-semibold ${member.tasks_active > 3 ? 'text-rose-500' : 'text-foreground'}`}>
            {member.tasks_active}
          </span>
        </td>

        {/* On-time rate */}
        <td className="px-3 py-3 text-center">
          {member.on_time_rate != null ? (
            <span className={`text-sm font-bold ${
              member.on_time_rate >= 70 ? 'text-emerald-600 dark:text-emerald-400' :
              member.on_time_rate >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500'
            }`}>
              {member.on_time_rate}%
            </span>
          ) : <span className="text-muted-foreground text-xs">—</span>}
        </td>

        {/* Avg hours */}
        <td className="px-3 py-3 text-center">
          <span className="text-sm text-foreground">
            {member.avg_actual_hours != null ? `${member.avg_actual_hours}h` : '—'}
          </span>
        </td>

        {/* Avg days */}
        <td className="px-3 py-3 text-center">
          <span className="text-sm text-foreground">
            {member.avg_days_to_complete != null ? `${member.avg_days_to_complete}j` : '—'}
          </span>
        </td>

        {/* Hours accuracy */}
        <td className="px-3 py-3 text-center">
          {member.hours_accuracy != null ? (
            <span className={`text-sm font-medium ${
              member.hours_accuracy >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
              member.hours_accuracy >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500'
            }`}>
              {member.hours_accuracy}%
            </span>
          ) : <span className="text-muted-foreground text-xs">—</span>}
        </td>

        {/* 30d velocity */}
        <td className="px-3 py-3 text-center">
          <span className="text-sm font-semibold text-foreground">{member.velocity_30d}</span>
        </td>

        {/* Expand toggle */}
        <td className="px-3 py-3 text-center">
          {open
            ? <ChevronDown className="h-4 w-4 text-muted-foreground mx-auto" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground mx-auto" />}
        </td>
      </tr>

      {/* Expanded: detail rows */}
      {open && (
        <tr className="bg-muted/10">
          <td colSpan={11} className="px-4 py-4">
            <div className="space-y-4">
              {/* Stat pills */}
              <div className="flex flex-wrap gap-2">
                <Stat icon={CheckCircle2} label="Tâches terminées"   value={member.tasks_done}           color="green"  />
                <Stat icon={Zap}          label="En cours / À risque" value={`${member.tasks_active}`}    color={member.tasks_active > 3 ? 'rose' : 'default'} />
                <Stat icon={Clock}        label="À faire"             value={member.tasks_todo}           color="default" />
                {member.avg_actual_hours != null && <Stat label="Moy. heures réelles" value={`${member.avg_actual_hours}h`} color="blue" />}
                {member.avg_days_to_complete != null && <Stat icon={TrendingUp} label="Délai moy. assign→done" value={`${member.avg_days_to_complete}j`} color="blue" />}
                {member.on_time_rate != null && <Stat label="Livraison à temps" value={`${member.on_time_rate}%`} color={member.on_time_rate >= 70 ? 'green' : member.on_time_rate >= 40 ? 'amber' : 'rose'} />}
                {member.hours_accuracy != null && <Stat label="Précision heures" value={`${member.hours_accuracy}%`} color={member.hours_accuracy >= 80 ? 'green' : 'amber'} />}
                <Stat icon={Zap} label="Vélocité 30j" value={member.velocity_30d} color="violet" />
              </div>

              {/* Priority breakdown */}
              {member.done_by_priority && Object.values(member.done_by_priority).some(v => v > 0) && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tâches terminées par priorité</p>
                  <div className="flex flex-wrap gap-2">
                    {['urgent', 'high', 'medium', 'low'].map(p => (
                      member.done_by_priority[p] > 0 && (
                        <span key={p} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_COLORS[p]}`}>
                          {PRIORITY_LABELS[p]} : {member.done_by_priority[p]}
                        </span>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Task history table */}
              {member.tasks_list?.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Historique des {member.tasks_list.length} dernières tâches terminées
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-border/60">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/60 bg-muted/40">
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Tâche</th>
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Type</th>
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Priorité</th>
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Début prévu</th>
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Fin prévue</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">H. est.</th>
                          <th className="px-3 py-2 text-right font-semibold text-muted-foreground">H. réelles</th>
                          <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Terminée le</th>
                        </tr>
                      </thead>
                      <tbody>
                        {member.tasks_list.map(t => {
                          const hoursOk = t.estimated_hours && t.actual_hours
                            ? t.actual_hours <= t.estimated_hours * 1.2
                            : null;
                          return (
                            <tr key={t.id} className="border-b border-border/30 hover:bg-muted/20">
                              <td className="px-3 py-2 font-medium text-foreground max-w-[200px] truncate">{t.title}</td>
                              <td className="px-3 py-2 text-muted-foreground">{t.issue_type}</td>
                              <td className="px-3 py-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[t.priority] ?? ''}`}>
                                  {PRIORITY_LABELS[t.priority] ?? t.priority}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{fmtDate(t.planned_start)}</td>
                              <td className="px-3 py-2 text-muted-foreground">{fmtDate(t.planned_end)}</td>
                              <td className="px-3 py-2 text-right text-muted-foreground">
                                {t.estimated_hours != null ? `${t.estimated_hours}h` : '—'}
                              </td>
                              <td className={`px-3 py-2 text-right font-medium ${
                                hoursOk === true ? 'text-emerald-600 dark:text-emerald-400' :
                                hoursOk === false ? 'text-rose-500' : 'text-muted-foreground'
                              }`}>
                                {t.actual_hours != null ? `${t.actual_hours}h` : '—'}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{fmtDate(t.completed_at)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Personal performance view (member sees only their own data)
// ---------------------------------------------------------------------------

function PersonalPerformanceView({ member, projectId }) {
  const score = member.performance_score ?? 0;
  const scoreCls = scoreColor(score);
  const [open, setOpen] = useState(false);

  const kpis = [
    { label: 'Tâches terminées', value: member.tasks_done,   color: 'green',  icon: CheckCircle2 },
    { label: 'En cours',         value: member.tasks_active, color: member.tasks_active > 3 ? 'rose' : 'default', icon: Activity },
    { label: 'À faire',          value: member.tasks_todo,   color: 'default', icon: Target },
    { label: 'Total assignées',  value: member.tasks_total,  color: 'blue',    icon: Star },
  ];

  const indicators = [
    member.on_time_rate      != null && { label: 'Livraison à temps',    value: `${member.on_time_rate}%`,      color: member.on_time_rate >= 70 ? 'green' : member.on_time_rate >= 40 ? 'amber' : 'rose' },
    member.hours_accuracy    != null && { label: 'Précision heures',     value: `${member.hours_accuracy}%`,    color: member.hours_accuracy >= 80 ? 'green' : 'amber' },
    member.avg_actual_hours  != null && { label: 'Heures réelles moy.',  value: `${member.avg_actual_hours}h`,  color: 'default' },
    member.avg_days_to_complete != null && { label: 'Délai moy. (j)',    value: `${member.avg_days_to_complete}j`, color: 'default' },
    { label: 'Vélocité 30 j',   value: member.velocity_30d, color: 'violet' },
  ].filter(Boolean);

  const recommendations = [];
  if (score >= 75)                    recommendations.push({ icon: Award,         cls: 'text-emerald-500', text: 'Excellent score de performance — continuez ainsi !' });
  else if (score >= 50)               recommendations.push({ icon: TrendingUp,    cls: 'text-indigo-500', text: 'Bon niveau. Concentrez-vous sur les tâches en cours pour progresser.' });
  else                                recommendations.push({ icon: Zap,           cls: 'text-amber-500', text: 'Score à améliorer. Identifiez les blocages et priorisez vos tâches urgentes.' });
  if (member.tasks_at_risk > 0)       recommendations.push({ icon: AlertTriangle, cls: 'text-red-500', text: `${member.tasks_at_risk} tâche${member.tasks_at_risk > 1 ? 's' : ''} à risque dans ce projet — anticipez.` });
  if (member.on_time_rate != null && member.on_time_rate < 50)
                                      recommendations.push({ icon: Clock,         cls: 'text-amber-500', text: 'Taux de livraison à temps faible — vérifiez vos estimations de durée.' });
  if (member.tasks_active > 4)        recommendations.push({ icon: Shield,        cls: 'text-violet-500', text: 'Charge élevée : trop de tâches simultanées. Concentrez-vous sur moins de tâches.' });

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-indigo-50/50 to-card dark:from-indigo-950/20 p-6 flex flex-col sm:flex-row gap-5 items-center sm:items-start shadow-sm">
        <div className="shrink-0">
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.name} className="w-20 h-20 rounded-2xl object-cover shadow-md" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-3xl font-black text-white shadow-md">
              {(member.name || '?')[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-bold text-foreground">{member.name}</h2>
          <p className="text-sm text-muted-foreground">{member.email}</p>
          {member.specialties?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {member.specialties.map(s => (
                <span key={s.id} className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: s.color || '#6366f1' }}>{s.name}</span>
              ))}
            </div>
          )}
        </div>
        {/* Score donut */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${scoreBg(score)}`} />
            <span className={`text-3xl font-black tabular-nums ${scoreCls}`}>{score}</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground">Score global</span>
          <div className="w-28 h-2 rounded-full bg-muted overflow-hidden mt-1">
            <div className={`h-2 rounded-full ${scoreBg(score)}`} style={{ width: `${score}%` }} />
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(({ label, value, color, icon: Icon }) => (
          <Stat key={label} label={label} value={value} color={color} icon={Icon} />
        ))}
      </div>

      {/* Indicateurs + Recommandations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Indicateurs clés */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4 pb-3 border-b border-border/80 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" /> Indicateurs de performance
          </h3>
          <div className="space-y-3">
            {indicators.map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={`text-sm font-semibold tabular-nums ${
                  color === 'green'  ? 'text-emerald-600 dark:text-emerald-400' :
                  color === 'rose'   ? 'text-rose-500' :
                  color === 'amber'  ? 'text-amber-600 dark:text-amber-400' :
                  color === 'violet' ? 'text-violet-600 dark:text-violet-400' :
                  'text-foreground'
                }`}>{value}</span>
              </div>
            ))}
          </div>
          {/* Priority breakdown */}
          {member.done_by_priority && Object.values(member.done_by_priority).some(v => v > 0) && (
            <div className="mt-4 pt-4 border-t border-border/60">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Terminées par priorité</p>
              <div className="flex flex-wrap gap-2">
                {['urgent','high','medium','low'].map(p =>
                  member.done_by_priority[p] > 0 && (
                    <span key={p} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY_COLORS[p]}`}>
                      {PRIORITY_LABELS[p]} : {member.done_by_priority[p]}
                    </span>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recommandations */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4 pb-3 border-b border-border/80 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" /> Recommandations
          </h3>
          <div className="space-y-3">
            {recommendations.map((r, i) => (
              <div key={i} className="flex gap-3 items-start rounded-lg border border-border bg-muted/30 p-3">
                <r.icon className={`h-4 w-4 mt-0.5 shrink-0 ${r.cls}`} />
                <p className="text-sm text-foreground leading-snug">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historique tâches terminées */}
      {member.tasks_list?.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 border-b border-border/80 hover:bg-muted/30 transition-colors"
            onClick={() => setOpen(v => !v)}
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Historique — {member.tasks_list.length} tâche{member.tasks_list.length > 1 ? 's' : ''} terminée{member.tasks_list.length > 1 ? 's' : ''}
            </h3>
            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
          {open && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Tâche</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Priorité</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Fin prévue</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">H. est.</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">H. réelles</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Terminée le</th>
                  </tr>
                </thead>
                <tbody>
                  {member.tasks_list.map(t => {
                    const hoursOk = t.estimated_hours && t.actual_hours
                      ? t.actual_hours <= t.estimated_hours * 1.2
                      : null;
                    return (
                      <tr key={t.id} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium text-foreground max-w-[220px] truncate">{t.title}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[t.priority] ?? ''}`}>
                            {PRIORITY_LABELS[t.priority] ?? t.priority}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{fmtDate(t.planned_end)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{t.estimated_hours != null ? `${t.estimated_hours}h` : '—'}</td>
                        <td className={`px-3 py-2 text-right font-medium ${hoursOk === true ? 'text-emerald-600 dark:text-emerald-400' : hoursOk === false ? 'text-rose-500' : 'text-muted-foreground'}`}>
                          {t.actual_hours != null ? `${t.actual_hours}h` : '—'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{fmtDate(t.completed_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MembersPerformancePage() {
  const { id } = useParams();
  const { user } = useAuth();

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then(r => r.data?.data ?? r.data?.project ?? r.data),
    staleTime: 60_000,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['members-performance', id],
    queryFn: () => api.get(`/projects/${id}/members-performance`).then(r => r.data),
  });

  const members       = data?.members ?? [];
  const isPersonal    = data?.is_personal_view === true;
  const ownMember     = isPersonal ? members[0] : null;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-destructive text-sm">
          Erreur de chargement : {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          to={`/projects/${id}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs text-muted-foreground">{project?.name ?? `Projet #${id}`}</p>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <BarChart3 className="h-5 w-5 text-primary" />
            {isPersonal ? 'Ma performance' : 'Performance des membres'}
          </h1>
        </div>
      </div>

      {/* ── Vue personnelle (membre) ── */}
      {isPersonal ? (
        ownMember ? (
          <PersonalPerformanceView member={ownMember} projectId={id} />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
            <p className="font-medium text-foreground">Vous n'avez pas encore de tâches dans ce projet.</p>
          </div>
        )
      ) : (
        /* ── Vue admin/chef ── */
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Membres" value={members.length} icon={Star} color="violet" />
            <SummaryCard
              label="Tâches terminées"
              value={members.reduce((s, m) => s + m.tasks_done, 0)}
              icon={CheckCircle2}
              color="green"
            />
            <SummaryCard
              label="Score moyen"
              value={members.length
                ? Math.round(members.reduce((s, m) => s + m.performance_score, 0) / members.length) + '%'
                : '—'}
              icon={TrendingUp}
              color="blue"
            />
            <SummaryCard
              label="Tâches actives"
              value={members.reduce((s, m) => s + m.tasks_active, 0)}
              icon={Zap}
              color="amber"
            />
          </div>

          {members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
              <p className="font-medium text-foreground">Aucun membre dans ce projet</p>
              <p className="mt-1 text-sm text-muted-foreground">Ajoutez des membres pour voir leurs performances.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground w-10">#</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground min-w-[180px]">Membre</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground min-w-[140px]">Score global</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">Terminées/Total</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">Actives</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">% À temps</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">H. moy.</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">Délai moy.</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">Précision H.</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">Vélo. 30j</th>
                    <th className="px-3 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, idx) => (
                    <MemberRow key={m.id} member={m} rank={idx + 1} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
            <span><span className="font-semibold text-emerald-600">Score ≥ 75</span> — excellent</span>
            <span><span className="font-semibold text-amber-600">50–74</span> — correct</span>
            <span><span className="font-semibold text-rose-500">{'< 50'}</span> — à améliorer</span>
            <span>Délai moy. = temps entre assignation et passage en &quot;terminé&quot; (max 90j)</span>
            <span>Précision H. = 1 – erreur relative heures réelles/estimées</span>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }) {
  const colors = {
    green:  'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/40',
    blue:   'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/40',
    violet: 'bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-800/40',
    amber:  'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/40',
  };
  const iconColors = {
    green: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-blue-600 dark:text-blue-400',
    violet: 'text-violet-600 dark:text-violet-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${iconColors[color]}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
