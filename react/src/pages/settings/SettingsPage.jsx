import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatAppRole } from '../../lib/roles';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { User, Mail, Shield, Clock, Calendar, UserCog, Users, Brain, LayoutGrid, Bell } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground">Votre profil et informations du compte</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary">
                {user?.name?.[0] || '?'}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{user?.name}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <InfoRow icon={User} label="Nom" value={user?.name} />
              <InfoRow icon={Mail} label="Email" value={user?.email} />
              <InfoRow icon={Clock} label="Fuseau horaire" value={user?.timezone || 'Africa/Tunis'} />
              <InfoRow
                icon={Calendar}
                label="Inscrit le"
                value={user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rôles & Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Rôles</p>
              <div className="flex flex-wrap gap-2">
                {(user?.roles || []).map((role) => {
                  const name = typeof role === 'string' ? role : role.name;
                  return (
                    <Badge key={name} variant="default">
                      <Shield className="mr-1 h-3 w-3" />
                      {formatAppRole(name)}
                    </Badge>
                  );
                })}
                {(!user?.roles || user.roles.length === 0) && (
                  <span className="text-sm text-muted-foreground">Aucun rôle</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Permissions</p>
              <div className="flex flex-wrap gap-2">
                {(user?.permissions || []).map((perm) => (
                  <Badge key={typeof perm === 'string' ? perm : perm.name} variant="outline" className="text-xs">
                    {typeof perm === 'string' ? perm : perm.name}
                  </Badge>
                ))}
                {(!user?.permissions || user.permissions.length === 0) && (
                  <span className="text-sm text-muted-foreground">Aucune permission directe</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <>
          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">Gestion des utilisateurs</CardTitle>
              <Link
                to="/users"
                className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <UserCog className="h-4 w-4" />
                Ouvrir le CRUD
              </Link>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Création, modification, suppression et rôles : utilisez la page dédiée (également accessible depuis le tableau de bord et le menu latéral).
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Raccourcis administration</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <AdminLink to="/users" icon={UserCog} label="Utilisateurs & rôles" />
              <AdminLink to="/teams" icon={Users} label="Équipes" />
              <AdminLink to="/projects" icon={LayoutGrid} label="Tous les projets" />
              <AdminLink to="/ai" icon={Brain} label="IA & Analytics" />
              <AdminLink to="/notifications" icon={Bell} label="Notifications" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function AdminLink({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </Link>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="w-28 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || '-'}</span>
    </div>
  );
}
