import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Shield, ShieldCheck, Plus, Archive, ArchiveRestore, Copy,
  Trash2, Users, Eye, Search, Lock, AlertTriangle, X,
} from 'lucide-react';
import api from '../../lib/api';
import { cn } from '../../lib/utils';
import PermissionGate from '../../components/auth/PermissionGate';

const fetchRoles = () => api.get('/roles').then((r) => r.data.data);

export default function RolesPage() {
  const qc = useQueryClient();
  const [search, setSearch]             = useState('');
  const [filter, setFilter]             = useState('all');   // all | active | archived
  const [showModal, setShowModal]       = useState(false);
  const [duplicateSource, setDuplicateSource] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rôle supprimé avec succès.');
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Erreur lors de la suppression.'),
  });

  const archiveMut = useMutation({
    mutationFn: (id) => api.post(`/roles/${id}/archive`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Rôle mis à jour.'); },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Erreur'),
  });

  const filtered = roles.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'active'   && !r.is_archived) ||
      (filter === 'archived' &&  r.is_archived);
    return matchSearch && matchFilter;
  });

  const activeCount   = roles.filter((r) => !r.is_archived).length;
  const archivedCount = roles.filter((r) =>  r.is_archived).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-gray-200 px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Rôles & Permissions</h1>
            <p className="text-sm text-gray-500">Gérez les rôles et leurs permissions associées.</p>
          </div>
        </div>
        <PermissionGate permission="role.create">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nouveau rôle
          </button>
        </PermissionGate>
      </div>

      {/* ── Stats bar ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total des rôles" value={roles.length} color="indigo" />
        <StatCard label="Rôles actifs"    value={activeCount}   color="green" />
        <StatCard label="Archivés"        value={archivedCount} color="orange" />
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un rôle…"
            className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
          {[
            { key: 'all',      label: 'Tous' },
            { key: 'active',   label: 'Actifs' },
            { key: 'archived', label: 'Archivés' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
                filter === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Chargement des rôles…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onArchive={() => archiveMut.mutate(role.id)}
              onDelete={() => setDeleteTarget(role)}
              onDuplicate={() => setDuplicateSource(role)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <Shield size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">Aucun rôle trouvé.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {showModal && (
        <CreateRoleModal
          onClose={() => setShowModal(false)}
          onCreated={() => { qc.invalidateQueries({ queryKey: ['roles'] }); setShowModal(false); }}
        />
      )}
      {duplicateSource && (
        <DuplicateRoleModal
          source={duplicateSource}
          onClose={() => setDuplicateSource(null)}
          onCreated={() => { qc.invalidateQueries({ queryKey: ['roles'] }); setDuplicateSource(null); }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          role={deleteTarget}
          loading={deleteMut.isPending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        />
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    green:  'bg-green-50  text-green-700  border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  };
  return (
    <div className={cn('rounded-xl border px-5 py-4 bg-white shadow-sm', colors[color])}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

// ─── Role Card ────────────────────────────────────────────────────────────────
function RoleCard({ role, onArchive, onDelete, onDuplicate }) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md',
        role.is_archived ? 'border-gray-200 opacity-70' : 'border-gray-200'
      )}
    >
      {/* Color accent bar */}
      <div className="h-1.5" style={{ backgroundColor: role.color ?? '#6366f1' }} />

      <div className="p-5">
        {/* Title row */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: (role.color ?? '#6366f1') + '20' }}
          >
            <Shield size={22} style={{ color: role.color ?? '#6366f1' }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="font-bold text-gray-900 text-base">{role.name}</span>
              {role.is_system && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 border border-indigo-200 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  <Lock size={10} /> Système
                </span>
              )}
              {role.is_archived && (
                <span className="rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-500">
                  Archivé
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 line-clamp-1">
              {role.description ?? 'Aucune description'}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 py-3 border-t border-b border-gray-100 mb-4">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Users size={14} className="text-gray-400" />
            <span className="font-semibold text-gray-900">{role.users_count ?? 0}</span>
            <span>{(role.users_count ?? 0) > 1 ? 'utilisateurs' : 'utilisateur'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Shield size={14} className="text-gray-400" />
            <span className="font-semibold text-gray-900">{role.permissions?.length ?? 0}</span>
            <span>{(role.permissions?.length ?? 0) > 1 ? 'permissions' : 'permission'}</span>
          </div>
          <div className="ml-auto text-xs font-semibold text-gray-400 bg-gray-100 rounded-lg px-2.5 py-1">
            Niv. {role.level ?? 10}
          </div>
        </div>

        {/* Permission chips */}
        {(role.permissions?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {role.permissions.slice(0, 3).map((p) => (
              <span
                key={p.id ?? p.name}
                className="rounded-lg bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700"
              >
                {p.name}
              </span>
            ))}
            {role.permissions.length > 3 && (
              <span className="rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-semibold text-indigo-600">
                +{role.permissions.length - 3} autres
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/admin/roles/${role.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <Eye size={13} /> Voir
          </Link>

          <PermissionGate permission="role.create">
            <button
              onClick={onDuplicate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Copy size={13} /> Dupliquer
            </button>
          </PermissionGate>

          {!role.is_system && (
            <>
              <PermissionGate permission="role.edit">
                <button
                  onClick={onArchive}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  {role.is_archived
                    ? <><ArchiveRestore size={13} /> Restaurer</>
                    : <><Archive size={13} /> Archiver</>
                  }
                </button>
              </PermissionGate>

              <PermissionGate permission="role.delete">
                <button
                  onClick={onDelete}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors ml-auto"
                >
                  <Trash2 size={13} /> Supprimer
                </button>
              </PermissionGate>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({ role, loading, onClose, onConfirm }) {
  return (
    <Modal title="Confirmer la suppression" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-start gap-4 rounded-xl bg-red-50 border border-red-200 p-4">
          <AlertTriangle size={22} className="shrink-0 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Cette action est irréversible.</p>
            <p className="text-sm text-red-700 mt-1">
              Le rôle <strong>"{role.name}"</strong> et toutes ses permissions associées seront définitivement supprimés.
              {(role.users_count ?? 0) > 0 && (
                <span className="block mt-1 font-semibold">
                  ⚠ {role.users_count} utilisateur(s) ont ce rôle.
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={btnSecondary} disabled={loading}>
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={15} />
            {loading ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Create Role Modal ────────────────────────────────────────────────────────
function CreateRoleModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1', level: 10 });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/roles', form);
      toast.success('Rôle créé avec succès.');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur lors de la création.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Créer un nouveau rôle" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Nom du rôle *">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputCls}
            placeholder="ex: Scrum Master"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={cn(inputCls, 'resize-none')}
            rows={2}
            placeholder="Courte description du rôle…"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Couleur">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 p-1 bg-white"
              />
              <span className="text-sm font-mono text-gray-600">{form.color}</span>
            </div>
          </Field>
          <Field label="Niveau (1–99)">
            <input
              type="number"
              min={1} max={99}
              value={form.level}
              onChange={(e) => setForm({ ...form, level: Number(e.target.value) })}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className={btnSecondary}>Annuler</button>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? 'Création…' : 'Créer le rôle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Duplicate Role Modal ─────────────────────────────────────────────────────
function DuplicateRoleModal({ source, onClose, onCreated }) {
  const [name, setName] = useState(`${source.name} (copie)`);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/roles/${source.id}/duplicate`, { name });
      toast.success(`Rôle dupliqué depuis "${source.name}".`);
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Dupliquer « ${source.name} »`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Nom du nouveau rôle *">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </Field>
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          Toutes les permissions de <strong>"{source.name}"</strong> seront copiées dans le nouveau rôle.
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className={btnSecondary}>Annuler</button>
          <button type="submit" disabled={loading} className={btnPrimary}>
            {loading ? 'Duplication…' : 'Dupliquer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
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

const btnPrimary = [
  'inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5',
  'text-sm font-semibold text-white',
  'hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed',
  'transition-colors shadow-sm',
].join(' ');

const btnSecondary = [
  'rounded-xl border border-gray-300 bg-white px-5 py-2.5',
  'text-sm font-semibold text-gray-700',
  'hover:bg-gray-50 disabled:opacity-50',
  'transition-colors shadow-sm',
].join(' ');
