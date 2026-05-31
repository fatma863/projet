import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { useI18n } from '../../i18n/I18nContext';
import {
  Plus, Search, Users, MoreVertical, Pencil, Trash2, Eye, X,
} from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  description: '',
  team_leader_id: '',
  memberIds: [],
};

function parseUsersResponse(res) {
  const raw = res.data.data;
  return Array.isArray(raw) ? raw : raw?.data || [];
}

export default function TeamsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [notice, setNotice] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teams', { search }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('per_page', '50');
      return api.get(`/teams?${params}`).then((r) => r.data.data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/teams/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });

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
          <h1 className="text-2xl font-bold text-foreground">{t('teams.title')}</h1>
          <p className="text-muted-foreground">{t('teams.subtitle')}</p>
        </div>
        <Button onClick={() => { setEditingTeam(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> {t('teams.newTeam')}
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('teams.searchTeams')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : data?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t('teams.noTeams')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((team) => (
            <Card key={team.id} className="group relative transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="absolute right-3 top-3">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(menuOpen === team.id ? null : team.id)}
                    className="rounded-md p-1 opacity-0 hover:bg-accent group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {menuOpen === team.id && (
                    <div className="absolute right-0 top-8 z-10 w-40 rounded-md border border-border bg-card py-1 text-foreground shadow-lg">
                      <Link
                        to={`/teams/${team.id}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                      >
                        <Eye className="h-4 w-4" /> {t('common.view')}
                      </Link>
                      <button
                        type="button"
                        onClick={() => { setEditingTeam(team); setShowForm(true); setMenuOpen(null); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                      >
                        <Pencil className="h-4 w-4" /> {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(t('teams.deleteConfirm'))) deleteMutation.mutate(team.id);
                          setMenuOpen(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" /> {t('common.delete')}
                      </button>
                    </div>
                  )}
                </div>

                <Link to={`/teams/${team.id}`} className="block">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                    {team.name[0]}
                  </div>
                  <h3 className="mb-1 font-semibold text-foreground">{team.name}</h3>
                  {team.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{team.description}</p>
                  )}
                  {team.team_leader?.name && (
                    <p className="mb-2 text-xs text-muted-foreground">
                      {t('teams.leader')} : <span className="font-medium text-foreground">{team.team_leader.name}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {t('teams.membersCount', { count: team.members_count || 0 })}
                    </span>
                    <span>{t('teams.projectsCount', { count: team.projects_count || 0 })}</span>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TeamFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingTeam(null); }}
        team={editingTeam}
        onSuccess={(message) => {
          setNotice(message);
          window.setTimeout(() => setNotice(null), 6000);
        }}
      />
    </div>
  );
}

function TeamFormModal({ open, onClose, team, onSuccess }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const isEdit = !!team;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users', 'team-form'],
    queryFn: () => api.get('/users?per_page=200').then(parseUsersResponse),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (team) {
      const leaderId = team.team_leader_id ?? team.team_leader?.id ?? '';
      const extraIds = (team.members || [])
        .map((m) => m.id)
        .filter((id) => leaderId && Number(id) !== Number(leaderId));
      setForm({
        name: team.name || '',
        description: team.description || '',
        team_leader_id: leaderId ? String(leaderId) : '',
        memberIds: extraIds,
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
    setErrors({});
  }, [open, team]);

  const leaderIdNum = form.team_leader_id ? Number(form.team_leader_id) : null;

  const availableToAdd = users.filter(
    (u) => u.id !== leaderIdNum && !form.memberIds.includes(u.id)
  );

  const addMember = (userId) => {
    const id = Number(userId);
    if (!id || id === leaderIdNum || form.memberIds.includes(id)) return;
    setForm((f) => ({ ...f, memberIds: [...f.memberIds, id] }));
  };

  const removeMember = (userId) => {
    setForm((f) => ({ ...f, memberIds: f.memberIds.filter((id) => id !== userId) }));
  };

  const mutation = useMutation({
    mutationFn: (payload) => (isEdit ? api.put(`/teams/${team.id}`, payload) : api.post('/teams', payload)),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      onSuccess?.(res.data?.message || (isEdit ? t('teams.updated') : t('teams.created')));
      onClose();
    },
    onError: (err) => {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      else setErrors({ _form: [err.response?.data?.message || t('teams.errorGeneric')] });
    },
  });

  const validateClient = () => {
    const next = {};
    if (!form.name.trim()) next.name = [t('teams.validationNameRequired')];
    if (!form.team_leader_id) next.team_leader_id = [t('teams.validationLeaderRequired')];
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateClient()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      team_leader_id: Number(form.team_leader_id),
      members: form.memberIds,
    };
    mutation.mutate(payload);
  };

  const selectedMemberUsers = form.memberIds
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean);

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t('teams.editTeam') : t('teams.newTeam')}>
      {loadingUsers && open ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors._form && (
            <p className="text-sm text-destructive">{errors._form[0]}</p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">{t('teams.nameLabel')} *</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoComplete="off"
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name[0]}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('teams.teamDescription')}</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('teams.teamLeaderLabel')} *</label>
            <Select
              value={form.team_leader_id}
              onChange={(e) => {
                const next = e.target.value;
                setForm((f) => ({
                  ...f,
                  team_leader_id: next,
                  memberIds: f.memberIds.filter((id) => Number(id) !== Number(next)),
                }));
              }}
            >
              <option value="">{t('teams.selectUser')}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </Select>
            {errors.team_leader_id && (
              <p className="mt-1 text-xs text-destructive">{errors.team_leader_id[0]}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('teams.members')}</label>
            <p className="mb-2 text-xs text-muted-foreground">
              {t('teams.addMemberHint')}
            </p>

            {selectedMemberUsers.length > 0 && (
              <ul className="mb-3 flex flex-wrap gap-2">
                {selectedMemberUsers.map((u) => (
                  <li key={u.id}>
                    <Badge variant="secondary" className="flex items-center gap-1 pr-1 font-normal">
                      <span className="max-w-[180px] truncate">{u.name}</span>
                      <button
                        type="button"
                        onClick={() => removeMember(u.id)}
                        className="rounded p-0.5 hover:bg-black/10"
                        aria-label={t('teams.removeMember') + ' ' + u.name}
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
              onChange={(e) => {
                addMember(e.target.value);
              }}
              disabled={!leaderIdNum || availableToAdd.length === 0}
            >
              <option value="">
                {!leaderIdNum ? t('teams.chooseLeaderFirst') : t('teams.addMember') + '…'}
              </option>
              {availableToAdd.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </Select>
            {!!leaderIdNum && availableToAdd.length === 0 && form.memberIds.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">{t('teams.noOtherUsers')}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? t('common.saving') : isEdit ? t('common.edit') : t('common.create')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
