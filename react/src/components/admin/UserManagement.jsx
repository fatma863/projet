import { useState, useEffect } from 'react';
import { APP_ROLE_LABELS, formatAppRole } from '../../lib/roles';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { UserAvatar } from '../ui/UserAvatar';
import {
  Search, UserCog, UserPlus, Pencil, UserMinus, UserCheck,
  Trash2, Users, ShieldCheck, UserX, ChevronLeft, ChevronRight,
} from 'lucide-react';

const fetchRoles = () => api.get('/roles').then((r) => r.data.data);

function RolePreview({ role }) {
  if (!role) return null;
  return (
    <div
      className="mt-2 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold"
      style={{
        backgroundColor: (role.color ?? '#6366f1') + '15',
        borderColor:     (role.color ?? '#6366f1') + '40',
        color:           role.color ?? '#6366f1',
      }}
    >
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: role.color ?? '#6366f1' }}
      />
      {APP_ROLE_LABELS[role.name] ?? role.name}
      {role.description && (
        <span className="font-normal text-gray-500 ml-1 truncate">— {role.description}</span>
      )}
    </div>
  );
}

function roleBadge(roleName, allRoles = []) {
  const found = allRoles.find((r) => r.name === roleName);
  const color = found?.color ?? '#6366f1';
  const rawName = found?.name ?? roleName;
  // Utilise le label d'affichage officiel pour les rôles système, sinon le nom brut
  const label = APP_ROLE_LABELS[rawName] ?? rawName ?? 'Collaborateur';
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: color + '18',
        borderColor:     color + '50',
        color:           color,
      }}
    >
      {label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm ${color}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-current/10">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <p className="text-xl font-bold leading-none">{value ?? '—'}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function UserManagement({ variant = 'page' }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.roles?.includes('admin');

  const { data: allRoles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    enabled: isAdmin,
    staleTime: 60000,
  });
  const activeRoles = allRoles.filter((r) => !r.is_archived);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: '', password_confirmation: '', status: 'active', role: '',
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalError, setModalError] = useState(null);
  const [userFormKey, setUserFormKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, roleFilter]);

  const { data: usersPayload, isLoading } = useQuery({
    queryKey: ['admin-users', debouncedSearch, statusFilter, roleFilter, page],
    enabled: isAdmin,
    queryFn: () => {
      const params = new URLSearchParams({ per_page: '20', page: String(page) });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (statusFilter) params.set('status', statusFilter);
      if (roleFilter) params.set('role', roleFilter);
      return api.get(`/users?${params}`).then((r) => r.data);
    },
  });

  const { data: statsPayload } = useQuery({
    queryKey: ['admin-users-stats'],
    enabled: isAdmin,
    staleTime: 30000,
    queryFn: () => api.get('/users?per_page=1').then((r) => r.data),
  });

  const { data: statsActive } = useQuery({
    queryKey: ['admin-users-stats-active'],
    enabled: isAdmin,
    staleTime: 30000,
    queryFn: () => api.get('/users?per_page=1&status=active').then((r) => r.data),
  });

  const { data: statsDisabled } = useQuery({
    queryKey: ['admin-users-stats-disabled'],
    enabled: isAdmin,
    staleTime: 30000,
    queryFn: () => api.get('/users?per_page=1&status=disabled').then((r) => r.data),
  });

  const users = usersPayload?.data || [];
  const meta = usersPayload?.meta || {};

  const saveUserMutation = useMutation({
    mutationFn: (payload) => (editingUser
      ? api.put(`/users/${editingUser.id}`, payload)
      : api.post('/users', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ name: '', email: '', password: '', password_confirmation: '', status: 'active', role: 'member' });
      setModalError(null);
    },
    onError: (err) => {
      if (err.response?.status === 422) {
        const errs = err.response.data?.errors;
        if (errs && typeof errs === 'object') {
          const first = Object.values(errs).flat()[0];
          setModalError(first || err.response.data?.message || 'Validation');
          return;
        }
      }
      setModalError(err.response?.data?.message || err.message || 'Erreur');
    },
  });

  const disableMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'Une erreur est survenue.'),
  });

  const enableMutation = useMutation({
    mutationFn: (id) => api.put(`/users/${id}`, { status: 'active' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'Une erreur est survenue.'),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}/permanent`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'Une erreur est survenue.'),
  });

  if (!isAdmin) return null;

  const defaultRole = activeRoles.find((r) => r.name === 'member')?.name
    ?? activeRoles[0]?.name
    ?? 'member';

  const openCreate = () => {
    setEditingUser(null);
    setUserForm({ name: '', email: '', password: '', password_confirmation: '', status: 'active', role: defaultRole });
    setModalError(null);
    setUserFormKey((k) => k + 1);
    setShowUserModal(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setUserForm({
      name:                  u.name  || '',
      email:                 u.email || '',
      password:              '',
      password_confirmation: '',
      status:                u.status || 'active',
      role:                  u.role  || defaultRole,
    });
    setModalError(null);
    setUserFormKey((k) => k + 1);
    setShowUserModal(true);
  };

  const totalUsers = statsPayload?.meta?.total ?? '—';
  const activeUsers = statsActive?.meta?.total ?? '—';
  const disabledUsers = statsDisabled?.meta?.total ?? '—';

  const content = (
    <>
      {/* Stats */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard icon={Users} label="Total utilisateurs" value={totalUsers} color="text-primary" />
        <StatCard icon={ShieldCheck} label="Actifs" value={activeUsers} color="text-emerald-600" />
        <StatCard icon={UserX} label="Désactivés" value={disabledUsers} color="text-rose-500" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="sm:w-44"
        >
          <option value="">Tous les rôles</option>
          {activeRoles.map((r) => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:w-40"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="disabled">Désactivé</option>
        </Select>
        {variant === 'dashboard' && (
          <>
            <Link
              to="/users"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              <UserCog className="h-4 w-4" />
              Page complète
            </Link>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              Ajouter
            </Button>
          </>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Aucun utilisateur trouvé</p>
          <p className="text-xs text-muted-foreground">Essayez de modifier vos filtres ou ajoutez un utilisateur.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 font-semibold text-foreground">Utilisateur</th>
                <th className="px-4 py-3 font-semibold text-foreground">Rôle</th>
                <th className="px-4 py-3 font-semibold text-foreground">Statut</th>
                <th className="px-4 py-3 font-semibold text-foreground">Inscrit depuis</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => {
                const isCurrentUser = u.id === user?.id;
                const isUserAdmin = u.role === 'admin';
                const isDisabled = u.status === 'disabled';
                return (
                  <tr key={u.id} className="group bg-card transition-colors hover:bg-accent/30">
                    {/* User cell */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <UserAvatar name={u.name} src={u.avatar_url} size="md" />
                          {isDisabled && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 ring-2 ring-card" title="Désactivé">
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            </span>
                          )}
                          {!isDisabled && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium text-foreground">{u.name}</span>
                            {isCurrentUser && (
                              <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Vous</span>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3">{roleBadge(u.role, allRoles)}</td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${isDisabled ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isDisabled ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        {isDisabled ? 'Désactivé' : 'Actif'}
                      </span>
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(u.created_at)}</td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit — always visible */}
                        <button
                          onClick={() => openEdit(u)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300"
                        >
                          <Pencil className="h-3 w-3" /> Modifier
                        </button>

                        {/* Activate / Deactivate — not for admin or self */}
                        {!isUserAdmin && !isCurrentUser && (
                          isDisabled ? (
                            <button
                              disabled={enableMutation.isPending}
                              onClick={() => {
                                if (window.confirm(`Réactiver "${u.name}" ?`)) enableMutation.mutate(u.id);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <UserCheck className="h-3 w-3" /> Réactiver
                            </button>
                          ) : (
                            <button
                              disabled={disableMutation.isPending}
                              onClick={() => {
                                if (window.confirm(`Désactiver "${u.name}" ?`)) disableMutation.mutate(u.id);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                            >
                              <UserMinus className="h-3 w-3" /> Désactiver
                            </button>
                          )
                        )}

                        {/* Delete — not for admin or self */}
                        {!isUserAdmin && !isCurrentUser && (
                          <button
                            disabled={permanentDeleteMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`Supprimer définitivement "${u.name}" ?\nCette action est irréversible.`))
                                permanentDeleteMutation.mutate(u.id);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" /> Supprimer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {Number(meta?.last_page || 1) > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {meta?.from}–{meta?.to} sur {meta?.total} utilisateurs
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={(meta?.current_page || 1) <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-sm transition-colors hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: meta?.last_page || 1 }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - (meta?.current_page || 1)) <= 2)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${p === (meta?.current_page || 1) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-accent'}`}
                >
                  {p}
                </button>
              ))}
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(meta?.current_page || 1) >= (meta?.last_page || 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-sm transition-colors hover:bg-accent disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={showUserModal}
        onClose={() => { setShowUserModal(false); setEditingUser(null); setModalError(null); }}
        title={editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        size="md"
      >
        <form
          key={userFormKey}
          className="space-y-4"
          autoComplete="off"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setModalError(null);
            if (userForm.password && userForm.password.length < 6) {
              setModalError('Le mot de passe doit contenir au moins 6 caractères.');
              return;
            }
            if (userForm.password !== userForm.password_confirmation) {
              setModalError('La confirmation du mot de passe ne correspond pas.');
              return;
            }
            const payload = { ...userForm };
            if (editingUser && !payload.password) {
              delete payload.password;
              delete payload.password_confirmation;
            }
            saveUserMutation.mutate(payload);
          }}
        >
          <input type="text" name="fake_username" autoComplete="username" tabIndex={-1} className="hidden" aria-hidden="true" />
          <input type="password" name="fake_password" autoComplete="current-password" tabIndex={-1} className="hidden" aria-hidden="true" />

          {modalError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm text-destructive">
              <span className="mt-0.5 shrink-0 text-base leading-none">⚠</span>
              {modalError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Nom complet</label>
              <Input
                name="admin_user_fullname"
                autoComplete="off"
                placeholder="Prénom Nom"
                value={userForm.name}
                onChange={(e) => setUserForm((s) => ({ ...s, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Adresse email</label>
              <Input
                type="email"
                name="admin_user_email"
                autoComplete="off"
                placeholder="email@exemple.com"
                value={userForm.email}
                onChange={(e) => setUserForm((s) => ({ ...s, email: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Mot de passe {editingUser && <span className="font-normal text-muted-foreground">(optionnel)</span>}
              </label>
              <Input
                type="password"
                name="admin_user_password_new"
                autoComplete="new-password"
                placeholder={editingUser ? 'Laisser vide pour conserver' : ''}
                value={userForm.password}
                onChange={(e) => setUserForm((s) => ({ ...s, password: e.target.value }))}
                required={!editingUser}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Confirmation du mot de passe {editingUser && <span className="font-normal text-muted-foreground">(optionnel)</span>}
              </label>
              <Input
                type="password"
                name="admin_user_password_confirm"
                autoComplete="new-password"
                placeholder={editingUser ? 'Laisser vide pour conserver' : ''}
                value={userForm.password_confirmation}
                onChange={(e) => setUserForm((s) => ({ ...s, password_confirmation: e.target.value }))}
                required={!editingUser && Boolean(userForm.password)}
              />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Rôle</label>
              <Select
                name="admin_user_app_role"
                autoComplete="off"
                value={userForm.role}
                onChange={(e) => setUserForm((s) => ({ ...s, role: e.target.value }))}
                disabled={Boolean(editingUser && editingUser.id === user?.id)}
              >
                {activeRoles.length === 0 && (
                  <option value="">Chargement…</option>
                )}
                {activeRoles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {APP_ROLE_LABELS[r.name] ?? r.name}{r.is_system ? ' ★' : ''}
                  </option>
                ))}
              </Select>
              {editingUser?.id === user?.id && (
                <p className="mt-1 text-xs text-muted-foreground">Vous ne pouvez pas modifier votre propre rôle.</p>
              )}
              {userForm.role && activeRoles.length > 0 && (
                <RolePreview role={activeRoles.find((r) => r.name === userForm.role)} />
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Statut</label>
              <Select
                name="admin_user_status"
                autoComplete="off"
                value={userForm.status}
                onChange={(e) => setUserForm((s) => ({ ...s, status: e.target.value }))}
              >
                <option value="active">Actif</option>
                <option value="disabled">Désactivé</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setShowUserModal(false)}>Annuler</Button>
            <Button type="submit" disabled={saveUserMutation.isPending}>
              {saveUserMutation.isPending ? 'Enregistrement…' : editingUser ? 'Enregistrer' : 'Créer l\'utilisateur'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );

  if (variant === 'dashboard') {
    return (
      <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-base">Gestion des utilisateurs</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Créer, modifier, désactiver et filtrer les comptes</p>
          </div>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Administration des comptes utilisateurs</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Ajouter un utilisateur
        </Button>
      </div>
      <Card>
        <CardContent className="pt-5">{content}</CardContent>
      </Card>
    </div>
  );
}
