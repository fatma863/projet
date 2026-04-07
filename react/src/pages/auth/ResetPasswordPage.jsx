import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { KeyRound } from 'lucide-react';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const rawEmail = params.get('email') || '';
    setToken(params.get('token') || '');
    try {
      setEmail(decodeURIComponent(rawEmail));
    } catch {
      setEmail(rawEmail);
    }
  }, [params]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!token || !email) {
      toast.error('Lien invalide ou incomplet. Demandez un nouvel e-mail de réinitialisation.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      toast.success('Mot de passe réinitialisé. Vous pouvez vous connecter.');
      navigate('/login', { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        (err?.response?.data?.errors && Object.values(err.response.data.errors).flat().join(' ')) ||
        'Impossible de réinitialiser le mot de passe.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg transition-shadow hover:shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <KeyRound className="h-6 w-6 text-primary" />
            Nouveau mot de passe
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choisissez un mot de passe sécurisé. Le lien reçu par e-mail expire après un délai limité.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="rp-email">
                E-mail
              </label>
              <Input
                id="rp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-card"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="rp-password">
                Nouveau mot de passe
              </label>
              <Input
                id="rp-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="bg-card"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="rp-confirm">
                Confirmation
              </label>
              <Input
                id="rp-confirm"
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="bg-card"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                Retour à la connexion
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
