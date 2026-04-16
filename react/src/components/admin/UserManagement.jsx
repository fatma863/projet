import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { UserAvatar } from '../ui/UserAvatar';
import { Search, UserCog } from 'lucide-react';
import { formatAppRole, normalizeAppRole } from '../../lib/roles';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'member', label: 'Membre' },
  { value: 'viewer', label: 'Client' },
];

/**
 * CRUD utilisateurs (admin). variant: "dashboard" = carte dans le tableau de bord ; "page" = page dédiée /users
 */
export default function UserManagement({ variant = 'page' }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.roles?.includes('admin');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: '', password_confirmation: '', status: 'active', role: 'member',
  });
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalError, setModalError] = useState(null);
  /** Incrémenté à chaque ouverture du modal pour remonter le formulaire et éviter l’autofill du navigateur */
  const [userFormKey, setUserFormKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data: usersPayload, isLoading } = useQuery({
    queryKey: ['admin-users', debouncedSearch, statusFilter, page],
    enabled: isAdmin,
    queryFn: () => {
      const params = new URLSearchParams({ per_page: '20', page: String(page) });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (statusFilter) params.set('status', statusFilter);
      return api.get(`/users?${params}`).then((r) => r.data);
    },
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
      setUserForm({
        name: '', email: '', password: '', password_confirmation: '', status: 'active', role: 'member',
      });
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

  const deleteUserMutation = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err) => {
      window.alert(err.response?.data?.message || err.message || 'Erreur');
    },
  });

  if (!isAdmin) return null;

  const appRoleBadge = (roleKey) => {
    const key = normalizeAppRole(roleKey);
    const label = formatAppRole(roleKey);
    const cls =
      key === 'admin'
        ? 'border-primary/30 bg-primary/15 text-primary'
        : key === 'viewer'
          ? 'border-amber-500/30 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100'
          : 'border-emerald-500/30 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100';
    return (
      <Badge variant="outline" className={`font-medium ${cls}`}>
        {label}
      </Badge>
    );
  };

  const openCreate = () => {
    setEditingUser(null);
    setUserForm({
      name: '', email: '', password: '', password_confirmation: '', status: 'active', role: 'member',
    });
    setModalError(null);
    setUserFormKey((k) => k + 1);
    setShowUserModal(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setUserForm({
      name: u.name || '',
      email: u.email || '',
      password: '',
      password_confirmation: '',
      status: u.status || 'active',
      role: normalizeAppRole(u.role) || 'member',
    });
    setModalError(null);
    setUserFormKey((k) => k + 1);
    setShowUserModal(true);
  };

  const content = (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="disabled">Désactivé</option>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {variant === 'dashboard' && (
            <Link
              to="/users"
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              <UserCog className="mr-1 h-4 w-4" />
              Page complète
            </Link>
          )}
          <Button size="sm" onClick={openCreate}>
            Ajouter un utilisateur
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucun utilisateur trouvé.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-accent/40">
              <tr>
                <th className="px-4 py-3 font-medium text-foreground">Nom</th>
                <th className="px-4 py-3 font-medium text-foreground">Email</th>
                <th className="px-4 py-3 font-medium text-foreground">Rôle applicatif</th>
                <th className="px-4 py-3 font-medium text-foreground">Statut</th>
                <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent/20">
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar name={u.name} src={u.avatar_url} size="sm" className="shrink-0" />
                      <span className="min-w-0 truncate font-medium text-foreground">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">{appRoleBadge(u.role)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.status === 'disabled' ? 'destructive' : 'success'}>
                      {u.status === 'disabled' ? 'Désactivé' : 'Actif'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={u.id === user?.id || u.status === 'disabled'}
                        onClick={() => {
                          if (window.confirm('Êtes-vous sûr de vouloir désactiver cet utilisateur ?')) {
                            deleteUserMutation.mutate(u.id);
                          }
                        }}
                      >
                        Désactiver
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {Number(meta?.last_page || 1) > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" disabled={(meta?.current_page || 1) <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Précédent
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {meta?.current_page || 1} / {meta?.last_page || 1}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={(meta?.current_page || 1) >= (meta?.last_page || 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      )}

      <Modal
        open={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setEditingUser(null);
          setModalError(null);
        }}
        title={editingUser ? 'Modifier utilisateur' : 'Créer utilisateur'}
        size="md"
      >
        <form
          key={userFormKey}
          className="space-y-3"
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
          {/* Leurres pour éviter que le navigateur préremplisse email / mot de passe (login enregistré) */}
          <input type="text" name="fake_username" autoComplete="username" tabIndex={-1} className="hidden" aria-hidden="true" />
          <input type="password" name="fake_password" autoComplete="current-password" tabIndex={-1} className="hidden" aria-hidden="true" />
          {modalError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {modalError}
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Nom</label>
            <Input
              name="admin_user_fullname"
              autoComplete="off"
              value={userForm.name}
              onChange={(e) => setUserForm((s) => ({ ...s, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <Input
              type="email"
              name="admin_user_email"
              autoComplete="off"
              value={userForm.email}
              onChange={(e) => setUserForm((s) => ({ ...s, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Mot de passe {editingUser ? '(laisser vide pour conserver)' : ''}</label>
            <Input
              type="password"
              name="admin_user_password_new"
              autoComplete="new-password"
              value={userForm.password}
              onChange={(e) => setUserForm((s) => ({ ...s, password: e.target.value }))}
              required={!editingUser}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Confirmation mot de passe {editingUser ? '(laisser vide pour conserver)' : ''}
            </label>
            <Input
              type="password"
              name="admin_user_password_confirm"
              autoComplete="new-password"
              value={userForm.password_confirmation}
              onChange={(e) => setUserForm((s) => ({ ...s, password_confirmation: e.target.value }))}
              required={!editingUser && Boolean(userForm.password)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Rôle applicatif</label>
            <Select
              name="admin_user_app_role"
              autoComplete="off"
              value={userForm.role}
              onChange={(e) => setUserForm((s) => ({ ...s, role: e.target.value }))}
              disabled={Boolean(editingUser && editingUser.id === user?.id)}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            {editingUser?.id === user?.id && (
              <p className="mt-1 text-xs text-muted-foreground">
                Vous ne pouvez pas modifier votre propre rôle depuis ce formulaire.
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Statut</label>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowUserModal(false)}>Annuler</Button>
            <Button type="submit" disabled={saveUserMutation.isPending}>
              {saveUserMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
        <p className="text-muted-foreground">Administration des comptes utilisateurs</p>
      </div>
      <Card>
        <CardContent className="pt-6">{content}</CardContent>
      </Card>
    </div>
  );
}
