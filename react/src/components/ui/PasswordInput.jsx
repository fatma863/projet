import { useState, forwardRef } from 'react';
import { Input } from './Input';
import { Eye, EyeOff } from 'lucide-react';

const PasswordInput = forwardRef(({ className, ...props }, ref) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={show ? 'text' : 'password'}
        className={className}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput'; // NOSONAR - component display name, not a credential

/** Visual password strength bar */
export function PasswordStrength({ password }) {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const config = [
    { label: 'Faible', color: 'bg-red-500', width: '25%' },
    { label: 'Moyen', color: 'bg-amber-500', width: '50%' },
    { label: 'Bon', color: 'bg-blue-500', width: '75%' },
    { label: 'Fort', color: 'bg-emerald-500', width: '100%' },
  ];

  const { label, color, width } = config[Math.min(score, 4) - 1] || config[0];

  return (
    <div className="mt-1.5 space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width }} />
      </div>
      <p className="text-[11px] text-muted-foreground">Force : {label}</p>
    </div>
  );
}

export { PasswordInput };
