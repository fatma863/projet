import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Brain, X, CheckCircle2, ChevronDown, ChevronRight,
  TrendingUp, AlertTriangle, Sparkles, Users, Zap,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(s) {
  if (s >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (s >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-500 dark:text-rose-400';
}
function barBg(s) {
  if (s >= 75) return 'bg-emerald-500';
  if (s >= 50) return 'bg-amber-500';
  return 'bg-rose-400';
}
function ringColor(s) {
  if (s >= 75) return '#10b981';
  if (s >= 50) return '#f59e0b';
  return '#f43f5e';
}
function initials(name) {
  return (name ?? '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

// ---------------------------------------------------------------------------
// Score ring (SVG)
// ---------------------------------------------------------------------------

function ScoreRing({ score, size = 80 }) {
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = ringColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor"
          strokeWidth={6} className="text-muted/30" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
          strokeWidth={6} strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <span className={`absolute text-base font-bold tabular-nums ${scoreColor(score)}`}>
        {score}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature groups & labels
// ---------------------------------------------------------------------------

const FEATURE_GROUPS = [
  { label: 'Compétences',     keys: ['specialty_exact_match', 'specialty_partial_match', 'specialty_breadth'] },
  { label: 'Charge / Dispo',  keys: ['current_task_load', 'capacity_utilization', 'overdue_ratio_inv'] },
  { label: 'Performance',     keys: ['overall_completion_rate', 'on_time_rate', 'hours_accuracy'] },
  { label: 'Affinité tâche',  keys: ['same_priority_success', 'same_type_success', 'complexity_affinity'] },
  { label: 'Contexte projet', keys: ['project_familiarity', 'team_familiarity', 'project_role_weight'] },
  { label: 'Tendance',        keys: ['recent_velocity', 'performance_trend', 'recent_on_time_rate'] },
  { label: 'Risque',          keys: ['at_risk_tasks_inv', 'experience_depth', 'collaboration_score', 'sprint_alignment'] },
];

function FeatureDimension({ label, keys, breakdown }) {
  const values = keys.map(k => breakdown?.[k]?.value ?? 0);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const pct = Math.round(avg * 100);
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors"
      >
        <span className="flex-1 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted flex-shrink-0">
          <div className={`h-full rounded-full ${barBg(pct)}`} style={{ width: `${pct}%` }} />
        </span>
        <span className={`w-8 text-right text-[11px] font-bold tabular-nums ${scoreColor(pct)}`}>{pct}%</span>
        {open ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
               : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-3 pb-2 space-y-1 border-t border-border/40">
          {keys.map(k => {
            const feat = breakdown?.[k];
            const fp   = Math.round((feat?.value ?? 0) * 100);
            return (
              <div key={k} className="flex items-center gap-2 py-0.5">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted/60">
                  <div className={`h-full rounded-full ${barBg(fp)}`} style={{ width: `${fp}%`, opacity: 0.8 }} />
                </div>
                <span className="w-36 truncate text-right text-[9px] text-muted-foreground">{feat?.label ?? k}</span>
                <span className={`w-7 text-right text-[9px] font-medium tabular-nums ${scoreColor(fp)}`}>{fp}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Performance stats strip
// ---------------------------------------------------------------------------

function StatPill({ label, value, sub, color = 'default' }) {
  const colors = {
    default: 'bg-muted/60 text-foreground',
    green:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    amber:   'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    blue:    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    rose:    'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  };
  return (
    <div className={`flex flex-col items-center rounded-lg px-3 py-1.5 ${colors[color]}`}>
      <span className="text-sm font-bold tabular-nums">{value}</span>
      <span className="text-[9px] font-medium opacity-80">{label}</span>
      {sub && <span className="text-[8px] opacity-60">{sub}</span>}
    </div>
  );
}

function StatsRow({ stats }) {
  if (!stats) return null;
  const {
    tasks_done, tasks_total, active_tasks,
    avg_hours, avg_days, on_time_pct,
  } = stats;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <StatPill label="Tâches terminées" value={tasks_done ?? '—'} sub={tasks_total ? `/ ${tasks_total} total` : undefined} color="green" />
      <StatPill label="En cours" value={active_tasks ?? '—'} color={active_tasks > 3 ? 'rose' : 'default'} />
      {avg_hours != null && (
        <StatPill label="Moy. heures/tâche" value={`${avg_hours}h`} color="blue" />
      )}
      {avg_days != null && (
        <StatPill label="Délai moy." value={`${avg_days}j`} sub="assignment→done" color="blue" />
      )}
      {on_time_pct != null && (
        <StatPill label="À temps" value={`${on_time_pct}%`} color={on_time_pct >= 70 ? 'green' : on_time_pct >= 40 ? 'amber' : 'rose'} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Best candidate hero card
// ---------------------------------------------------------------------------

function HeroCandidate({ candidate }) {
  const breakdown = candidate.feature_breakdown ?? {};

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-violet-500/5 p-4">
      {/* Top row: avatar + info + score ring */}
      <div className="flex items-start gap-4">
        {candidate.avatar_url ? (
          <img src={candidate.avatar_url} alt={candidate.name} className="h-14 w-14 shrink-0 rounded-full object-cover shadow-inner ring-2 ring-background" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary shadow-inner">
            {initials(candidate.name)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-semibold text-foreground">{candidate.name}</p>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              Recommandé IA
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{candidate.email}</p>

          {/* Performance stats */}
          <StatsRow stats={candidate.stats} />

          {/* Strengths */}
          {candidate.strengths?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {candidate.strengths.map(s => (
                <span key={s} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  + {s}
                </span>
              ))}
            </div>
          )}

          {/* Weaknesses */}
          {candidate.weaknesses?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {candidate.weaknesses.map(w => (
                <span key={w} className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                  – {w}
                </span>
              ))}
            </div>
          )}
        </div>

        <ScoreRing score={candidate.score} size={72} />
      </div>

      {/* 7-dimension breakdown */}
      {Object.keys(breakdown).length > 0 && (
        <div className="mt-4 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Analyse 22 features · 7 dimensions
          </p>
          {FEATURE_GROUPS.map(g => (
            <FeatureDimension key={g.label} label={g.label} keys={g.keys} breakdown={breakdown} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alternative candidate row
// ---------------------------------------------------------------------------

function AltCandidate({ candidate, rank, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(candidate.user_id ?? candidate.id)}
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all hover:bg-accent/60 ${
        isSelected ? 'border-primary/50 bg-primary/5' : 'border-border/60'
      }`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
        {rank}
      </span>
      {candidate.avatar_url ? (
        <img src={candidate.avatar_url} alt={candidate.name} className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-background" />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
          {initials(candidate.name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{candidate.name}</p>
        <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${barBg(candidate.score)}`}
            style={{ width: `${candidate.relative_score ?? candidate.score}%` }} />
        </div>
        {/* Compact stats */}
        {candidate.stats && (
          <div className="mt-1 flex flex-wrap gap-1">
            {candidate.stats.tasks_done != null && (
              <span className="text-[9px] text-muted-foreground">
                ✓ {candidate.stats.tasks_done} tâches
              </span>
            )}
            {candidate.stats.avg_hours != null && (
              <span className="text-[9px] text-muted-foreground">· {candidate.stats.avg_hours}h moy.</span>
            )}
            {candidate.stats.on_time_pct != null && (
              <span className={`text-[9px] font-medium ${candidate.stats.on_time_pct >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                · {candidate.stats.on_time_pct}% à temps
              </span>
            )}
          </div>
        )}
      </div>
      <span className={`text-sm font-bold tabular-nums ${scoreColor(candidate.score)}`}>{candidate.score}%</span>
      {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Model info badge
// ---------------------------------------------------------------------------

function ModelBadge({ info }) {
  if (!info) return null;
  const trained = info.is_trained;
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold
      ${trained
        ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      }`}
    >
      <Brain className="h-3 w-3" />
      {trained
        ? `GBM+RF · ${info.n_samples ?? '?'} samples${info.accuracy ? ` · acc ${(info.accuracy * 100).toFixed(0)}%` : ''}`
        : 'Poids par défaut (modèle non entraîné)'}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

export function MLRecommendationModal({ open, onClose, result, selectedId, onAccept }) {
  const candidates = result?.candidates ?? result?.top_users ?? [];
  const modelInfo  = result?.model_info;
  const [chosen, setChosen] = useState(null);

  if (!open) return null;

  const best      = candidates[0] ?? null;
  const alts      = candidates.slice(1);
  const activeId  = chosen ?? (best ? (best.user_id ?? best.id) : null);
  const activeCandidate = candidates.find(c => (c.user_id ?? c.id) === activeId) ?? best;

  const handleAccept = () => {
    if (activeCandidate) {
      onAccept(activeCandidate.user_id ?? activeCandidate.id, activeCandidate);
    }
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.currentTarget === e.target) onClose(); }}
    >
      <div className="relative flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl max-h-[calc(100dvh-3rem)] animate-in fade-in-0 zoom-in-[0.97] slide-in-from-bottom-4 duration-200">

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-violet-500/10 via-primary/5 to-transparent px-5 py-4 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Recommandation IA</p>
              <p className="text-[11px] text-muted-foreground">Analyse de {candidates.length} candidat{candidates.length > 1 ? 's' : ''} · 22 features ML</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModelBadge info={modelInfo} />
            <button type="button" onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {candidates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
              <p className="font-medium text-foreground">Aucun candidat disponible</p>
              <p className="text-sm text-muted-foreground">{result?.message ?? 'Aucun membre compatible trouvé.'}</p>
            </div>
          ) : (
            <>
              {/* Best candidate */}
              {activeCandidate && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-violet-500" />
                    {activeCandidate === best && !chosen ? 'Meilleur candidat recommandé' : 'Candidat sélectionné'}
                  </div>
                  <HeroCandidate candidate={activeCandidate} />
                </div>
              )}

              {/* Alternatives */}
              {alts.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    Autres candidats
                  </div>
                  <div className="space-y-1.5">
                    {alts.map((c, idx) => {
                      const cid = c.user_id ?? c.id;
                      return (
                        <AltCandidate
                          key={cid}
                          candidate={c}
                          rank={idx + 2}
                          isSelected={activeId === cid}
                          onSelect={id => setChosen(id === (best?.user_id ?? best?.id) ? null : id)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Insight note */}
              {modelInfo?.is_trained && (
                <div className="rounded-lg border border-violet-200 bg-violet-50/50 dark:border-violet-800/40 dark:bg-violet-900/10 px-3 py-2">
                  <p className="text-[11px] text-violet-700 dark:text-violet-300">
                    <span className="font-semibold">IA entraînée</span> sur {modelInfo.n_samples ?? '?'} assignations historiques.
                    Précision {modelInfo.accuracy ? (modelInfo.accuracy * 100).toFixed(0) + '%' : 'N/A'}.
                    Les scores combinent compétences, charge de travail, historique de performance et contexte projet.
                  </p>
                </div>
              )}
              {!modelInfo?.is_trained && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10 px-3 py-2">
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    <span className="font-semibold">Poids par défaut</span> — aucun modèle entraîné.
                    Entraînez le modèle avec <code className="font-mono">php artisan ml:train</code> pour des recommandations personnalisées.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {candidates.length > 0 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3 rounded-b-2xl shrink-0">
            <p className="text-[11px] text-muted-foreground">
              Sélectionnez un candidat · Cliquez sur Accepter pour assigner
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={!activeCandidate}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                Accepter la recommandation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
