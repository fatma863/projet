import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import {
  Plus, Search, FolderKanban, Calendar, Users, MoreVertical,
  Pencil, Trash2, Eye, X,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planification', variant: 'secondary' },
  { value: 'active', label: 'Actif', variant: 'success' },
  { value: 'on_hold', label: 'En pause', variant: 'warning' },
  { value: 'completed', label: 'Terminé', variant: 'default' },
  { value: 'cancelled', label: 'Annulé', variant: 'destructive' },
];

function getStatusBadge(status) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  return opt ? <Badge variant={opt.variant}>{opt.label}</Badge> : <Badge>{status}</Badge>;
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Basse' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
];

const EMPTY_FORM = {
  name: '',
  code: '',
  description: '',
  team_id: '',
  status: 'planning',
  start_date: '',
  end_date: '',
  project_manager_id: '',
  memberIds: [],
  priority: 'medium',
  budget: '',
};

function parseUsersResponse(res) {
  const raw = res.data.data;
  return Array.isArray(raw) ? raw : raw?.data || [];
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin');
  const isViewer = user?.roles?.includes('viewer');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [formSession, setFormSession] = useState(0);
  const [notice, setNotice] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, status: filterStatus }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      params.set('per_page', '50');
      return api.get(`/projects?${params}`).then((r) => r.data.data);
    },
  });

  const { data: teams } = useQuery({
    queryKey: ['teams-list'],
    enabled: isAdmin,
    queryFn: () => api.get('/teams?per_page=100').then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const openEdit = (project) => {
    setEditingProject(project);
    setShowForm(true);
    setFormSession((s) => s + 1);
    setMenuOpen(null);
  };

  const openCreate = () => {
    setEditingProject(null);
    setShowForm(true);
    setFormSession((s) => s + 1);
  };

  const handleDelete = (id) => {
    if (window.confirm('Supprimer ce projet ?')) {
      deleteMutation.mutate(id);
    }
    setMenuOpen(null);
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm"
        >
          {notice}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projets</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Gérez vos projets et suivez leur avancement'
              : isViewer
                ? 'Projets auxquels vous avez été invité. Les autres ne sont pas visibles.'
                : 'Projets auxquels vous participez (membre ou assigné). Les autres ne sont pas visibles.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau projet
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un projet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : data?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderKanban className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun projet trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((project) => (
            <Card key={project.id} className="group relative transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="absolute right-3 top-3">
                  <button
                    onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}
                    className="rounded-md p-1 opacity-0 hover:bg-accent group-hover:opacity-100"
                    disabled={!isAdmin}
                  >
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {menuOpen === project.id && isAdmin && (
                    <div className="absolute right-0 top-8 z-10 w-40 rounded-md border border-border bg-white py-1 shadow-lg">
                      <Link
                        to={`/projects/${project.id}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                      >
                        <Eye className="h-4 w-4" /> Voir
                      </Link>
                      <button
                        onClick={() => openEdit(project)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                      >
                        <Pencil className="h-4 w-4" /> Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" /> Supprimer
                      </button>
                    </div>
                  )}
                </div>

                <Link to={`/projects/${project.id}`} className="block">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold text-primary">
                      {project.code}
                    </span>
                    {getStatusBadge(project.status)}
                    {project.priority && (
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {PRIORITY_OPTIONS.find((p) => p.value === project.priority)?.label || project.priority}
                      </Badge>
                    )}
                  </div>
                  <h3 className="mb-1 font-semibold text-foreground">{project.name}</h3>
                  {project.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {project.team && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {project.team.name}
                      </span>
                    )}
                    {project.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(project.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FolderKanban className="h-3.5 w-3.5" /> {project.tasks_count || 0} tâches
                    </span>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProjectFormModal
        key={formSession}
        open={showForm}
        onClose={() => { setShowForm(false); setEditingProject(null); }}
        project={editingProject}
        teams={teams || []}
        onSuccess={(message) => {
          setNotice(message);
          window.setTimeout(() => setNotice(null), 6000);
        }}
      />
    </div>
  );
}

function ProjectFormModal({ open, onClose, project, teams, onSuccess }) {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const isEdit = !!project;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users', 'project-form'],
    queryFn: () => api.get('/users?per_page=200').then(parseUsersResponse),
    enabled: open,
  });

  const { data: projectDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['project', project?.id, 'form'],
    queryFn: () => api.get(`/projects/${project.id}`).then((r) => r.data.project),
    enabled: open && isEdit && !!project?.id,
  });

  useEffect(() => {
    if (!open) return;
    if (!isEdit) {
      setForm({ ...EMPTY_FORM });
      setErrors({});
      return;
    }
    if (!projectDetail) return;
    const ownerId = projectDetail.owner?.id;
    const pmId = projectDetail.project_manager_id;
    const memberIds = (projectDetail.members || [])
      .map((m) => m.id)
      .filter((id) => id !== ownerId && id !== (pmId ?? null));
    setForm({
      name: projectDetail.name || '',
      code: projectDetail.code || '',
      description: projectDetail.description || '',
      team_id: projectDetail.team_id || '',
      status: projectDetail.status || 'planning',
      start_date: projectDetail.start_date || '',
      end_date: projectDetail.end_date || '',
      project_manager_id: pmId ? String(pmId) : '',
      memberIds,
      priority: projectDetail.priority || 'medium',
      budget: projectDetail.budget != null ? String(projectDetail.budget) : '',
    });
    setErrors({});
  }, [open, isEdit, projectDetail]);

  const pmNum = form.project_manager_id ? Number(form.project_manager_id) : null;
  const ownerId = isEdit ? projectDetail?.owner?.id : authUser?.id;
  const availableMembers = users.filter(
    (u) =>
      u.id !== pmNum
      && u.id !== ownerId
      && !form.memberIds.includes(u.id)
  );

  const addMember = (userId) => {
    const id = Number(userId);
    if (!id || id === pmNum || id === ownerId || form.memberIds.includes(id)) return;
    setForm((f) => ({ ...f, memberIds: [...f.memberIds, id] }));
  };

  const removeMember = (userId) => {
    setForm((f) => ({ ...f, memberIds: f.memberIds.filter((id) => id !== userId) }));
  };

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? api.put(`/projects/${project.id}`, data) : api.post('/projects', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (project?.id) {
        queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      }
      onSuccess?.(res.data?.message || (isEdit ? 'Projet mis à jour.' : 'Projet créé avec succès.'));
      onClose();
    },
    onError: (err) => {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
        return;
      }
      setErrors({
        general: [err.response?.data?.message || err.message || 'Erreur de création'],
      });
    },
  });

  const validateClient = () => {
    const next = {};
    if (!form.name.trim()) next.name = ['Le nom est obligatoire.'];
    if (!form.code.trim()) next.code = ['Le code est obligatoire.'];
    if (!form.project_manager_id) {
      next.project_manager_id = ['Le chef de projet est obligatoire.'];
    }
    if (form.start_date && form.end_date) {
      const a = new Date(form.start_date);
      const b = new Date(form.end_date);
      if (b < a) {
        next.end_date = ['La date de fin doit être postérieure ou égale à la date de début.'];
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateClient()) return;

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      project_manager_id: Number(form.project_manager_id),
      members: form.memberIds,
    };
    if (form.team_id) payload.team_id = Number(form.team_id);
    if (form.start_date) payload.start_date = form.start_date;
    if (form.end_date) payload.end_date = form.end_date;
    const budgetStr = form.budget != null ? String(form.budget).trim() : '';
    if (budgetStr !== '' && !Number.isNaN(Number(budgetStr))) {
      payload.budget = Number(budgetStr);
    } else {
      payload.budget = null;
    }

    mutation.mutate(payload);
  };

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const selectedMemberUsers = form.memberIds
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean);

  const showLoading = loadingUsers || (isEdit && loadingDetail);

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le projet' : 'Nouveau projet'} size="lg">
      {showLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errors.general[0]}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Nom *</label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name[0]}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Code *</label>
              <Input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} maxLength={10} />
              {errors.code && <p className="mt-1 text-xs text-destructive">{errors.code[0]}</p>}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Équipe</label>
              <Select value={form.team_id} onChange={(e) => set('team_id', e.target.value)}>
                <option value="">Aucune</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Statut</label>
              <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Date de début</label>
              <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
              {errors.start_date && <p className="mt-1 text-xs text-destructive">{errors.start_date[0]}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Date de fin</label>
              <Input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
              {errors.end_date && <p className="mt-1 text-xs text-destructive">{errors.end_date[0]}</p>}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Chef de projet *</label>
            <Select
              value={form.project_manager_id}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({
                  ...f,
                  project_manager_id: v,
                  memberIds: f.memberIds.filter((id) => Number(id) !== Number(v)),
                }));
              }}
            >
              <option value="">Sélectionner un utilisateur</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </Select>
            {errors.project_manager_id && (
              <p className="mt-1 text-xs text-destructive">{errors.project_manager_id[0]}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Membres du projet</label>
            <p className="mb-2 text-xs text-muted-foreground">
              Le propriétaire du projet et le chef de projet sont ajoutés automatiquement ; ajoutez d&apos;autres membres ici.
            </p>
            {selectedMemberUsers.length > 0 && (
              <ul className="mb-3 flex flex-wrap gap-2">
                {selectedMemberUsers.map((u) => (
                  <li key={u.id}>
                    <Badge variant="secondary" className="flex items-center gap-1 pr-1 font-normal">
                      <span className="max-w-[200px] truncate">{u.name}</span>
                      <button
                        type="button"
                        onClick={() => removeMember(u.id)}
                        className="rounded p-0.5 hover:bg-black/10"
                        aria-label={`Retirer ${u.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <Select
              key={form.memberIds.join('-')}
              value=""
              onChange={(e) => addMember(e.target.value)}
              disabled={!pmNum || availableMembers.length === 0}
            >
              <option value="">
                {!pmNum ? 'Choisissez d&apos;abord un chef de projet' : 'Ajouter un membre…'}
              </option>
              {availableMembers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Priorité</label>
              <Select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Budget (€)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.budget}
                onChange={(e) => set('budget', e.target.value)}
              />
              {errors.budget && <p className="mt-1 text-xs text-destructive">{errors.budget[0]}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
