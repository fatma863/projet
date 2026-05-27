import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Check, X, Pause, Play } from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';

const PERM_META = {
  'project.pause': {
    badge: 'PAUSE',
    badgeCls: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300',
    Icon: Pause,
    rowCls: 'bg-amber-50/60',
  },
  'project.resume': {
    badge: 'REPRENDRE',
    badgeCls: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300',
    Icon: Play,
    rowCls: 'bg-emerald-50/60',
  },
};

const fetchRoles       = () => api.get('/roles').then((r) => r.data.data);
const fetchPermissions = () => api.get('/permissions').then((r) => r.data.data);

export default function PermissionMatrixPage() {
  const { data: roles  = [], isLoading: rolesLoading  } = useQuery({ queryKey: ['roles'],       queryFn: fetchRoles });
  const { data: groups = [], isLoading: groupsLoading } = useQuery({ queryKey: ['permissions'], queryFn: fetchPermissions });

  const activeRoles = roles.filter((r) => !r.is_archived);

  if (rolesLoading || groupsLoading) {
    return <div className="min-h-screen bg-gray-50 p-6 text-gray-500 text-sm">Chargement de la matrice…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck size={22} className="text-indigo-600" />
          Matrice des Permissions
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Vue d'ensemble des permissions accordées à chaque rôle.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-gray-50">
                <th className="sticky left-0 z-10 bg-gray-50 px-5 py-4 text-left font-bold text-gray-700 min-w-[220px] border-r border-gray-200">
                  Libellé de la permission
                </th>
                {activeRoles.map((role) => (
                  <th key={role.id} className="px-4 py-4 text-center font-semibold min-w-[120px]">
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <span className="text-gray-800 text-xs font-bold">{role.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <>
                  {/* Group header */}
                  <tr key={`group-${group.slug}`} className="border-b border-gray-100 bg-gray-50">
                    <td
                      colSpan={activeRoles.length + 1}
                      className="sticky left-0 px-5 py-2.5 text-sm font-bold"
                      style={{ color: group.color }}
                    >
                      {group.name}
                    </td>
                  </tr>

                  {/* Permission rows */}
                  {group.permissions.map((perm, idx) => {
                    const meta = PERM_META[perm.name];
                    const PermIcon = meta?.Icon;
                    return (
                    <tr
                      key={perm.name}
                      className={cn(
                        'border-b border-gray-100 transition-colors',
                        meta ? meta.rowCls + ' hover:brightness-95' : (idx % 2 === 0 ? 'bg-white hover:bg-indigo-50' : 'bg-gray-50/50 hover:bg-indigo-50')
                      )}
                    >
                      <td className="sticky left-0 z-10 px-5 py-3 border-r border-gray-100 bg-inherit">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          {PermIcon && <PermIcon className="h-3 w-3 shrink-0 opacity-70" />}
                          <p className="font-semibold text-gray-800 text-xs">{perm.description || perm.name}</p>
                          {meta && (
                            <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none', meta.badgeCls)}>
                              {meta.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-[10px] font-mono mt-0.5">{perm.name}</p>
                      </td>
                      {activeRoles.map((role) => {
                        const hasIt = role.name === 'admin' ||
                          role.permissions.some((p) => p.name === perm.name);
                        return (
                          <td key={role.id} className="px-4 py-3 text-center">
                            {hasIt ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 mx-auto">
                                <Check size={13} className="text-green-600" />
                              </span>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 mx-auto">
                                <X size={13} className="text-gray-400" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-5 text-sm text-gray-600 bg-white rounded-xl border border-gray-200 px-5 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
            <Check size={13} className="text-green-600" />
          </span>
          Permission accordée
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
            <X size={13} className="text-gray-400" />
          </span>
          Permission non accordée
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3.5 w-3.5 rounded-full bg-indigo-500" />
          <span>Le rôle <strong>admin</strong> possède automatiquement toutes les permissions</span>
        </div>
        <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-300 flex items-center gap-1">
            <Pause size={9} /> PAUSE
          </span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-300 flex items-center gap-1">
            <Play size={9} /> REPRENDRE
          </span>
          <span className="text-xs text-gray-500">Fonctionnalités restreintes — policy en plus du RBAC</span>
        </div>
      </div>

      {/* Pause / Resume info box */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm space-y-2">
        <p className="font-bold text-amber-900 flex items-center gap-2">
          <Pause size={15} className="text-amber-600" />
          Note — Permissions Pause &amp; Reprise de projet
        </p>
        <p className="text-amber-800">
          Ces deux permissions sont liées à la fonctionnalité de <strong>mise en pause</strong> des projets (statut <code className="rounded bg-amber-100 px-1 font-mono text-xs">on_hold</code>).
          Quand un projet est en pause, toutes les modifications sont bloquées au niveau du middleware backend (HTTP&nbsp;423 — PROJECT_LOCKED).
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mt-2">
          <div className="rounded-lg bg-white border border-amber-200 p-3">
            <p className="font-semibold text-amber-800 mb-1 flex items-center gap-1"><Pause size={12} /> project.pause</p>
            <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
              <li>Admin global → toujours autorisé</li>
              <li>Chef du projet (chef_id) → toujours autorisé</li>
              <li>Propriétaire du projet → autorisé via policy</li>
              <li>Tout rôle avec cette permission → autorisé</li>
            </ul>
          </div>
          <div className="rounded-lg bg-white border border-emerald-200 p-3">
            <p className="font-semibold text-emerald-800 mb-1 flex items-center gap-1"><Play size={12} /> project.resume</p>
            <ul className="text-xs text-emerald-700 space-y-0.5 list-disc list-inside">
              <li>Admin global → toujours autorisé</li>
              <li>Chef du projet (chef_id) → toujours autorisé</li>
              <li className="text-red-600 font-medium">Cette permission RBAC seule ne suffit pas</li>
              <li className="text-red-600">La policy vérifie uniquement admin ou chef_id</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
