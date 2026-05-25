import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Shield, Save, Users, CheckSquare, Square, Lock,
} from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import PermissionGate from '../../components/auth/PermissionGate';

const fetchRole        = (id) => api.get(`/roles/${id}`).then((r) => r.data.data);
const fetchPermissions = ()   => api.get('/permissions').then((r) => r.data.data);
const fetchRoleUsers   = (id) => api.get(`/roles/${id}/users`).then((r) => r.data);

export default function RoleDetailPage() {
  const { id } = useParams();
  const qc     = useQueryClient();

  const { data: role,  isLoading: roleLoading  } = useQuery({ queryKey: ['role', id],   queryFn: () => fetchRole(id) });
  const { data: groups = [], isLoading: permsLoading } = useQuery({ queryKey: ['permissions'], queryFn: fetchPermissions });
  const { data: usersData } = useQuery({ queryKey: ['role-users', id], queryFn: () => fetchRoleUsers(id) });

  const syncMut = useMutation({
    mutationFn: (permissions) => api.put(`/roles/${id}/permissions`, { permissions }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role', id] });
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Permissions synchronisées.');
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Erreur'),
  });

  const updateMut = useMutation({
    mutationFn: (data) => api.put(`/roles/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['role', id] }); toast.success('Rôle mis à jour.'); },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Erreur'),
  });

  const [selectedPerms, setSelectedPerms] = useState(null);
  const [editForm, setEditForm]           = useState(null);

  if (role && selectedPerms === null) setSelectedPerms(role.permissions.map((p) => p.name));
  if (role && editForm    === null) setEditForm({ name: role.name, description: role.description ?? '', color: role.color, level: role.level });

  if (roleLoading || permsLoading) {
    return <div className="min-h-screen bg-gray-50 p-6 text-gray-500 text-sm">Chargement…</div>;
  }
  if (!role) {
    return <div className="min-h-screen bg-gray-50 p-6 text-red-500 text-sm">Rôle introuvable.</div>;
  }

  const togglePerm = (permName) => {
    if (role.name === 'admin') return;
    setSelectedPerms((prev) =>
      prev.includes(permName) ? prev.filter((p) => p !== permName) : [...prev, permName]
    );
  };

  const toggleGroup = (group) => {
    if (role.name === 'admin') return;
    const groupPerms  = group.permissions.map((p) => p.name);
    const allSelected = groupPerms.every((p) => (selectedPerms ?? []).includes(p));
    if (allSelected) {
      setSelectedPerms((prev) => prev.filter((p) => !groupPerms.includes(p)));
    } else {
      setSelectedPerms((prev) => [...new Set([...prev, ...groupPerms])]);
    }
  };

  const hasUnsavedChanges =
    selectedPerms !== null &&
    JSON.stringify([...(selectedPerms ?? [])].sort()) !==
    JSON.stringify([...role.permissions.map((p) => p.name)].sort());

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6 max-w-5xl mx-auto">

      {/* ── Back link ──────────────────────────────────────────────── */}
      <Link
        to="/admin/roles"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft size={16} /> Retour aux rôles
      </Link>

      {/* ── Role header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 bg-white rounded-2xl border border-gray-200 px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl border-2"
            style={{ backgroundColor: role.color + '20', borderColor: role.color + '50' }}
          >
            <Shield size={28} style={{ color: role.color }} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{role.name}</h1>
              {role.is_system && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                  <Lock size={10} /> Système
                </span>
              )}
              {role.is_archived && (
                <span className="rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                  Archivé
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{role.description ?? 'Aucune description'}</p>
          </div>
        </div>

        <PermissionGate permission="role.edit">
          {hasUnsavedChanges && (
            <button
              onClick={() => syncMut.mutate(selectedPerms)}
              disabled={syncMut.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Save size={16} />
              {syncMut.isPending ? 'Enregistrement…' : 'Sauvegarder les permissions'}
            </button>
          )}
        </PermissionGate>
      </div>

      {/* ── Content grid ───────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Left column */}
        <div className="lg:col-span-1 space-y-4">

          {/* Edit form */}
          <PermissionGate permission="role.edit">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-4">Informations du rôle</h2>
              {editForm && (
                <div className="space-y-4">
                  {!role.is_system && (
                    <Field label="Nom">
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className={inputCls}
                      />
                    </Field>
                  )}
                  <Field label="Description">
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className={cn(inputCls, 'resize-none')}
                      rows={3}
                    />
                  </Field>
                  <Field label="Couleur">
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={editForm.color}
                        onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                        className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 p-1 bg-white"
                      />
                      <span className="text-sm font-mono text-gray-600">{editForm.color}</span>
                    </div>
                  </Field>
                  <Field label="Niveau (1-99)">
                    <input
                      type="number"
                      min={1} max={99}
                      value={editForm.level}
                      onChange={(e) => setEditForm({ ...editForm, level: Number(e.target.value) })}
                      className={inputCls}
                    />
                  </Field>
                  <button
                    onClick={() => updateMut.mutate(editForm)}
                    disabled={updateMut.isPending}
                    className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {updateMut.isPending ? 'Mise à jour…' : 'Mettre à jour'}
                  </button>
                </div>
              )}
            </div>
          </PermissionGate>

          {/* Users panel */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users size={18} className="text-indigo-500" />
              Utilisateurs
              <span className="ml-auto text-sm font-semibold text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">
                {usersData?.total ?? 0}
              </span>
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(usersData?.data ?? []).slice(0, 8).map((u) => (
                <div key={u.id} className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-gray-50 transition-colors">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{u.name}</p>
                    <p className="truncate text-xs text-gray-500">{u.email}</p>
                  </div>
                </div>
              ))}
              {(usersData?.total ?? 0) === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucun utilisateur avec ce rôle.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right column — permissions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              Permissions accordées
              <span className="ml-2 text-sm font-semibold text-gray-400 bg-gray-100 rounded-full px-2.5 py-0.5">
                {(selectedPerms ?? []).length} sélectionnée{(selectedPerms ?? []).length > 1 ? 's' : ''}
              </span>
            </h2>
            {role.name === 'admin' && (
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                L'administrateur dispose de toutes les permissions
              </span>
            )}
          </div>

          <div className="space-y-3">
            {groups.map((group) => {
              const groupPerms     = group.permissions.map((p) => p.name);
              const selectedInGroup = groupPerms.filter((p) => (selectedPerms ?? []).includes(p));
              const allSelected    = selectedInGroup.length === groupPerms.length;
              const someSelected   = selectedInGroup.length > 0 && !allSelected;

              return (
                <div key={group.slug} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  {/* Group header */}
                  <button
                    className="flex w-full items-center justify-between mb-3"
                    onClick={() => toggleGroup(group)}
                    disabled={role.name === 'admin'}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: group.color }} />
                      <span className="text-sm font-bold text-gray-900">{group.name}</span>
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-md px-1.5 py-0.5">
                        {selectedInGroup.length}/{groupPerms.length}
                      </span>
                    </div>
                    <PermissionGate permission="role.edit">
                      {allSelected
                        ? <CheckSquare size={17} className="text-indigo-600" />
                        : someSelected
                          ? <Square size={17} className="text-gray-400" />
                          : <Square size={17} className="text-gray-300" />
                      }
                    </PermissionGate>
                  </button>

                  {/* Individual permissions */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.permissions.map((perm) => {
                      const checked = role.name === 'admin' || (selectedPerms ?? []).includes(perm.name);
                      return (
                        <label
                          key={perm.name}
                          className={cn(
                            'flex items-start gap-2.5 rounded-xl p-2.5 cursor-pointer transition-colors border',
                            checked
                              ? 'bg-indigo-50 border-indigo-200'
                              : 'border-transparent hover:bg-gray-50 border-gray-100',
                            role.name === 'admin' && 'cursor-default'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePerm(perm.name)}
                            disabled={role.name === 'admin'}
                            className="mt-0.5 shrink-0 accent-indigo-600"
                          />
                          <div>
                            <p className="text-xs font-semibold text-gray-900">{perm.description || perm.name}</p>
                            <p className="text-[10px] font-mono text-gray-400 mt-0.5">{perm.name}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <PermissionGate permission="role.edit">
            {hasUnsavedChanges && (
              <div className="flex justify-end">
                <button
                  onClick={() => syncMut.mutate(selectedPerms)}
                  disabled={syncMut.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Save size={16} />
                  {syncMut.isPending ? 'Enregistrement…' : 'Sauvegarder les permissions'}
                </button>
              </div>
            )}
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = [
  'w-full rounded-xl border border-gray-300 bg-white',
  'px-3.5 py-2.5 text-sm text-gray-900',
  'placeholder-gray-400',
  'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
  'transition-colors shadow-sm',
].join(' ');
