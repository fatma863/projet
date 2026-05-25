import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, TrendingUp, Users, ChevronRight, Save, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import api from '../../lib/api';

// ── API helpers ──────────────────────────────────────────────────────────────

const postWorklog = (taskId, body) =>
  api.post(`/tasks/${taskId}/worklog`, body).then((r) => r.data);

const fetchUserProgress = (taskId) =>
  api.get(`/tasks/${taskId}/worklog/users`).then((r) => r.data.data);

// ── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, max = 100, color = 'bg-indigo-500' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function WorkflowBadge({ status }) {
  const map = {
    todo:        { label: 'À faire',       cls: 'bg-gray-100 text-gray-600' },
    in_progress: { label: 'En cours',      cls: 'bg-blue-100 text-blue-700' },
    in_review:   { label: 'En révision',   cls: 'bg-purple-100 text-purple-700' },
    blocked:     { label: 'Bloquée',       cls: 'bg-red-100 text-red-700' },
    at_risk:     { label: 'À risque',      cls: 'bg-amber-100 text-amber-700' },
    done:        { label: 'Terminée',      cls: 'bg-green-100 text-green-700' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────

export default function DailyProgressModal({ open, onClose, task, projectId }) {
  const qc = useQueryClient();

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    worked_minutes: 30,
    progress_delta: 10,
    note: '',
    date: today,
  });

  const [activeTab, setActiveTab] = useState('log'); // 'log' | 'breakdown'

  const { data: userProgress = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['task-user-progress', task?.id],
    queryFn: () => fetchUserProgress(task.id),
    enabled: open && !!task?.id && activeTab === 'breakdown',
  });

  const mutation = useMutation({
    mutationFn: (body) => postWorklog(task.id, body),
    onSuccess: (data) => {
      toast.success(`Travail enregistré — progression tâche : ${data.task_progress}%`);
      qc.invalidateQueries({ queryKey: ['tasks', String(projectId)] });
      qc.invalidateQueries({ queryKey: ['task-user-progress', task.id] });
      qc.invalidateQueries({ queryKey: ['project', String(projectId)] });
      setForm((f) => ({ ...f, note: '', worked_minutes: 30, progress_delta: 10 }));
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Erreur lors de l\'enregistrement'),
  });

  if (!task) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const progressColor =
    task.progress_percent >= 80 ? 'bg-green-500' :
    task.progress_percent >= 50 ? 'bg-blue-500' :
    task.progress_percent >= 25 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={null}
      size="lg"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5 pb-4 border-b border-gray-100">
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">
            Journal de travail
          </p>
          <h2 className="text-base font-bold text-gray-900 truncate">{task.title}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <WorkflowBadge status={task.workflow_status} />
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs font-semibold text-gray-600">
              Progression : {task.progress_percent ?? 0}%
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar value={task.progress_percent ?? 0} color={progressColor} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-5 border-b border-gray-100">
        {[
          { key: 'log',       label: 'Enregistrer travail', icon: Clock },
          { key: 'breakdown', label: 'Par contributeur',    icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px
              ${activeTab === key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: log work ── */}
      {activeTab === 'log' && (
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date</label>
            <input
              type="date"
              max={today}
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            />
          </div>

          {/* Worked minutes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Temps travaillé
              <span className="ml-2 text-indigo-600 font-bold">
                {form.worked_minutes >= 60
                  ? `${Math.floor(form.worked_minutes / 60)}h ${form.worked_minutes % 60 > 0 ? `${form.worked_minutes % 60}min` : ''}`
                  : `${form.worked_minutes}min`}
              </span>
            </label>
            <input
              type="range"
              min={5}
              max={480}
              step={5}
              value={form.worked_minutes}
              onChange={(e) => setForm((f) => ({ ...f, worked_minutes: +e.target.value }))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5 min</span>
              <span>4 h</span>
              <span>8 h</span>
            </div>
          </div>

          {/* Progress delta */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <TrendingUp size={14} className="inline mr-1 text-indigo-500" />
              Ma contribution à la progression
              <span className="ml-2 text-indigo-600 font-bold">
                {form.progress_delta > 0 ? '+' : ''}{form.progress_delta}%
              </span>
            </label>
            <input
              type="range"
              min={-20}
              max={50}
              step={1}
              value={form.progress_delta}
              onChange={(e) => setForm((f) => ({ ...f, progress_delta: +e.target.value }))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>-20%</span>
              <span>0%</span>
              <span>+50%</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Estimation de ce que vous avez accompli aujourd'hui. Le système calculera la progression globale automatiquement.
            </p>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Note (optionnel)</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Ce qui a été fait, obstacles rencontrés…"
              rows={3}
              maxLength={500}
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-sm"
            />
            <p className="text-right text-xs text-gray-400 mt-0.5">{form.note.length}/500</p>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save size={15} />
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer le travail'}
          </button>
        </form>
      )}

      {/* ── Tab: per-user breakdown ── */}
      {activeTab === 'breakdown' && (
        <div className="space-y-3">
          {loadingUsers && (
            <div className="text-center py-8 text-sm text-gray-400">Chargement…</div>
          )}
          {!loadingUsers && userProgress.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">
              Aucune contribution enregistrée pour cette tâche.
            </div>
          )}
          {userProgress.map((row) => (
            <div
              key={row.user?.id}
              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
            >
              <div className="h-9 w-9 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                {row.user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{row.user?.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <ProgressBar value={row.user_progress} color="bg-indigo-500" />
                  <span className="text-xs font-bold text-indigo-600 shrink-0">{row.user_progress}%</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-gray-700">{row.total_hours}h</p>
                <p className="text-[10px] text-gray-400">loggées</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
