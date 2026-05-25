import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell, ArrowLeft, Mail, Smartphone, Save } from 'lucide-react';
import api from '../../lib/api';

// ── Preference groups ────────────────────────────────────────────────────────

const PREF_SECTIONS = [
  {
    label: 'Canaux',
    icon: '📡',
    prefs: [
      { key: 'notify_in_app',  label: 'Notifications in-app',  description: 'Afficher dans le centre de notifications' },
      { key: 'notify_email',   label: 'Notifications par email', description: 'Recevoir un email pour chaque notification' },
    ],
  },
  {
    label: 'Tâches',
    icon: '✅',
    prefs: [
      { key: 'notify_type_task_assigned',  label: 'Tâche assignée',      description: 'Quand une tâche vous est attribuée' },
      { key: 'notify_type_task_updated',   label: 'Tâche modifiée',      description: 'Quand une tâche que vous surveillez est modifiée' },
      { key: 'notify_type_task_completed', label: 'Tâche terminée',      description: 'Quand une tâche que vous surveillez est terminée' },
      { key: 'notify_type_task_delayed',   label: 'Tâche en retard',     description: 'Alertes automatiques pour les tâches dépassant leur délai' },
    ],
  },
  {
    label: 'Commentaires',
    icon: '💬',
    prefs: [
      { key: 'notify_type_comment', label: 'Commentaires & mentions', description: 'Quand quelqu\'un commente ou vous mentionne dans une tâche' },
    ],
  },
  {
    label: 'Projets',
    icon: '📁',
    prefs: [
      { key: 'notify_type_project', label: 'Modifications projet', description: 'Quand un projet que vous suivez est mis à jour' },
    ],
  },
  {
    label: 'Invitations & permissions',
    icon: '🔐',
    prefs: [
      { key: 'notify_type_invitation',  label: 'Invitations',   description: 'Quand vous êtes invité à rejoindre un projet' },
      { key: 'notify_type_permission',  label: 'Permissions',   description: 'Quand vos permissions ou votre rôle changent' },
    ],
  },
  {
    label: 'Alertes intelligentes',
    icon: '🤖',
    prefs: [
      { key: 'notify_type_ai_alert', label: 'Alertes IA', description: 'Suggestions et alertes automatiques générées par l\'IA (risques, surcharge)' },
    ],
  },
];

// ── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        value ? 'bg-indigo-600' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationSettingsPage() {
  const { data: remote, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => api.get('/notifications/preferences').then((r) => r.data),
  });

  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    if (remote && !prefs) {
      setPrefs(remote);
    }
  }, [remote]);

  const mutation = useMutation({
    mutationFn: (data) => api.put('/notifications/preferences', data),
    onSuccess: () => toast.success('Préférences enregistrées.'),
    onError: () => toast.error('Erreur lors de la sauvegarde.'),
  });

  const handleToggle = (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (prefs) mutation.mutate(prefs);
  };

  if (isLoading || !prefs) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 text-sm text-gray-400 text-center">Chargement…</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/notifications" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100">
            <Bell size={18} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Préférences de notifications</h1>
            <p className="text-xs text-gray-500">Choisissez quand et comment vous souhaitez être notifié</p>
          </div>
        </div>

        {/* Stats summary */}
        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm">
            <Smartphone size={16} className="text-indigo-500" />
            <span className="font-semibold text-gray-700">In-app</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${prefs.notify_in_app ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {prefs.notify_in_app ? 'Activé' : 'Désactivé'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail size={16} className="text-indigo-500" />
            <span className="font-semibold text-gray-700">Email</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${prefs.notify_email ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {prefs.notify_email ? 'Activé' : 'Désactivé'}
            </span>
          </div>
        </div>

        {/* Preference sections */}
        {PREF_SECTIONS.map((section) => (
          <div key={section.label} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-3 flex items-center gap-2">
              <span className="text-base">{section.icon}</span>
              <span className="text-sm font-bold text-gray-800">{section.label}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {section.prefs.map((pref) => (
                <div key={pref.key} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{pref.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{pref.description}</p>
                  </div>
                  <Toggle
                    value={!!prefs[pref.key]}
                    onChange={(val) => handleToggle(pref.key, val)}
                    disabled={mutation.isPending}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <Save size={15} />
            {mutation.isPending ? 'Enregistrement…' : 'Enregistrer les préférences'}
          </button>
        </div>
      </div>
    </div>
  );
}
