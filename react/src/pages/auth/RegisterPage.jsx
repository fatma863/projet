import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { safeRedirectPath } from '../../lib/safeRedirect';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { FolderKanban } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const clientErrors = {};
    if (!form.name.trim()) clientErrors.name = ['Le nom est obligatoire.'];
    if (!form.email.trim()) clientErrors.email = ['L\'email est obligatoire.'];
    if (!form.password) clientErrors.password = ['Le mot de passe est obligatoire.'];
    if (form.password && form.password.length < 8) clientErrors.password = ['Le mot de passe doit contenir au moins 8 caractères.'];
    if (form.password !== form.password_confirmation) {
      clientErrors.password_confirmation = ['La confirmation du mot de passe ne correspond pas.'];
    }
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setLoading(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password, form.password_confirmation);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({ general: [err.response?.data?.message || 'Erreur d\'inscription'] });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FolderKanban size={24} />
          </div>
          <CardTitle>Créer un compte</CardTitle>
          <CardDescription>
            Rejoignez la plateforme de gestion de projets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off" noValidate>
            {errors.general && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errors.general[0]}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nom complet</label>
              <Input
                name="register_name"
                autoComplete="off"
                placeholder="Votre nom"
                value={form.name}
                onChange={update('name')}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name[0]}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Adresse e-mail</label>
              <Input
                type="email"
                name="register_email"
                autoComplete="off"
                placeholder="votre@email.com"
                value={form.email}
                onChange={update('email')}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email[0]}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mot de passe</label>
              <Input
                type="password"
                name="register_password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={form.password}
                onChange={update('password')}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password[0]}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirmer le mot de passe</label>
              <Input
                type="password"
                name="register_password_confirmation"
                autoComplete="new-password"
                placeholder="••••••••"
                value={form.password_confirmation}
                onChange={update('password_confirmation')}
              />
              {errors.password_confirmation && <p className="text-xs text-destructive">{errors.password_confirmation[0]}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner size="sm" className="text-white" /> : 'S\'inscrire'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Déjà un compte ?{' '}
              <Link
                to={searchParams.get('redirect') ? `/login?redirect=${encodeURIComponent(searchParams.get('redirect'))}` : '/login'}
                className="font-medium text-primary hover:underline"
              >
                Se connecter
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
