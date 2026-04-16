import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { safeRedirectPath } from '../../lib/safeRedirect';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Spinner } from '../../components/ui/Spinner';
import { motion } from 'framer-motion';
import { CheckCircle2, Shield, Zap } from 'lucide-react';

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
      navigate(safeRedirectPath(searchParams.get('redirect')));
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left decorative panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center lg:p-12">
        {/* Floating orbs */}
        <div className="animate-float absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="animate-float absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" style={{ animationDelay: '2s' }} />
        <div className="animate-float absolute left-1/2 top-1/3 h-40 w-40 rounded-full bg-violet-300/10 blur-2xl" style={{ animationDelay: '4s' }} />

        {/* Brand content */}
        <div className="relative z-10 max-w-md text-center text-white">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black backdrop-blur-sm animate-pulse-glow">
            T
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">TAC-TIC</h1>
          <p className="mt-2 text-lg font-medium text-white/80">Gestion de projets intelligente</p>
          <p className="mt-6 text-sm italic text-white/60">
            &laquo; Quel que soit votre rêve… Considérez-le réalisé ! &raquo;
          </p>

          <div className="mt-10 space-y-4 text-left">
            {[
              { icon: Zap, text: 'Planification assistée par IA' },
              { icon: Shield, text: 'Certifié ISO 27001 & 9001' },
              { icon: CheckCircle2, text: 'Collaboration en temps réel' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                <item.icon className="h-5 w-5 shrink-0 text-indigo-200" />
                <span className="text-sm font-medium text-white/90">{item.text}</span>
              </div>
            ))}
          </div>

          <p className="mt-12 text-xs text-white/40">Propulsé par Groupe New Ways</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full items-center justify-center bg-background p-6 lg:w-1/2 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Mobile brand (hidden on lg) */}
          <div className="mb-8 text-center lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-black text-white shadow-lg shadow-indigo-500/25">
                T
              </div>
              <span className="font-display text-xl font-bold tracking-tight">TAC-TIC</span>
            </Link>
          </div>

          <div className="rounded-2xl border-0 bg-card/80 p-8 shadow-2xl backdrop-blur-sm lg:bg-card lg:backdrop-blur-none">
            <div className="mb-6 text-center">
              <h2 className="font-display text-2xl font-bold tracking-tight">Connexion</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Accédez à votre espace de gestion de projets
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Adresse e-mail</label>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Mot de passe</label>
                  <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                    Mot de passe oublié ?
                  </Link>
                </div>
                <PasswordInput
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
                {loading ? <Spinner size="sm" className="text-white" /> : 'Se connecter'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Pas encore de compte ?{' '}
                <Link
                  to={searchParams.get('redirect') ? `/register?redirect=${encodeURIComponent(searchParams.get('redirect'))}` : '/register'}
                  className="font-medium text-primary hover:underline"
                >
                  Créer un compte
                </Link>
              </p>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} TAC-TIC &mdash; Groupe New Ways
          </p>
        </motion.div>
      </div>
    </div>
  );
}
