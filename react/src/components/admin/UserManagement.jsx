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
import { Search, UserCog } from 'lucide-react';
import { APP_ROLE_LABELS, formatAppRole, normalizeAppRole } from '../../lib/roles';

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
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [modalError, setModalError] = useState(null);
  /** Incrémenté à chaque ouverture du modal pour remonter le formulaire et éviter l’autofill du navigateur */
  const [userFormKey, setUserFormKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', debouncedSearch],
    enabled: isAdmin,
    queryFn: () => {
      const params = new URLSearchParams({ per_page: '200' });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      return api.get(`/users?${params}`).then((r) => r.data.data || []);
    },
  });

  const saveUserMutation = useMutation({
    mutationFn: (payload) => (editingUser
      ? api.put(`/users/${editingUser.id}`, payload)
      : api.post('/users', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ name: '', email: '', password: '', role: 'member' });
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

  const openCreate = () => {
    setEditingUser(null);
    setUserForm({ name: '', email: '', password: '', role: 'member' });
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
      role: normalizeAppRole(Array.isArray(u.roles) ? u.roles[0] : u.roles),
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
        <div className="flex flex-wrap items-center gap-2">
          {variant === 'dashboard' && (
            <Link
              to="/users"
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium hover:bg-accent"
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
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-accent/40">
              <tr>
                <th className="px-4 py-3 font-medium text-foreground">Nom</th>
                <th className="px-4 py-3 font-medium text-foreground">Email</th>
                <th className="px-4 py-3 font-medium text-foreground">Rôle</th>
                <th className="px-4 py-3 text-right font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent/20">
                  <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{formatAppRole(u.roles?.[0])}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={u.id === user?.id}
                        onClick={() => {
                          if (window.confirm('Supprimer cet utilisateur ?')) {
                            deleteUserMutation.mutate(u.id);
                          }
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            const payload = { ...userForm };
            if (editingUser && !payload.password) {
              delete payload.password;
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
            <label className="mb-1 block text-sm font-medium">Rôle</label>
            <Select
              name="admin_user_role"
              autoComplete="off"
              value={userForm.role}
              onChange={(e) => setUserForm((s) => ({ ...s, role: e.target.value }))}
            >
              <option value="admin">{APP_ROLE_LABELS.admin}</option>
              <option value="member">{APP_ROLE_LABELS.member}</option>
              <option value="viewer">{APP_ROLE_LABELS.viewer}</option>
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
            <p className="mt-1 text-sm text-muted-foreground">Créer, modifier, supprimer et attribuer les rôles</p>
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
        <p className="text-muted-foreground">Administration des comptes et des rôles</p>
      </div>
      <Card>
        <CardContent className="pt-6">{content}</CardContent>
      </Card>
    </div>
  );
}
