import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { safeRedirectPath } from '../../lib/safeRedirect';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { FolderKanban } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de connexion');
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
          <CardTitle>Connexion</CardTitle>
          <CardDescription>
            Connectez-vous à votre espace de gestion de projets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off" noValidate>
            {/* Champs leurres pour limiter l’auto-remplissage du navigateur */}
            <input type="text" name="fake_username" autoComplete="username" tabIndex={-1} className="hidden" />
            <input type="password" name="fake_password" autoComplete="current-password" tabIndex={-1} className="hidden" />
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Adresse e-mail</label>
              <Input
                type="email"
                name="login_email"
                autoComplete="off"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mot de passe</label>
              <Input
                type="password"
                name="login_password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Spinner size="sm" className="text-white" /> : 'Se connecter'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Pas encore de compte ?{' '}
              <Link
                to={searchParams.get('redirect') ? `/register?redirect=${encodeURIComponent(searchParams.get('redirect'))}` : '/register'}
                className="font-medium text-primary hover:underline"
              >
                S'inscrire
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
