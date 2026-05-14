import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

export function AuthLeftPanel({ gradient, orb2Color, orb3Color, children }) {
  return (
    <div className={`relative hidden overflow-hidden bg-gradient-to-br ${gradient} lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center lg:p-12`}>
      <div className="animate-float absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className={`animate-float absolute -bottom-20 -right-20 h-72 w-72 rounded-full ${orb2Color} blur-3xl`} style={{ animationDelay: '2s' }} />
      <div className={`animate-float absolute left-1/2 top-1/3 h-40 w-40 rounded-full ${orb3Color} blur-2xl`} style={{ animationDelay: '4s' }} />
      <div className="relative z-10 max-w-md text-center text-white">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black backdrop-blur-sm animate-pulse-glow">
          T
        </div>
        {children}
        <p className="mt-12 text-xs text-white/40">Propulsé par Groupe New Ways</p>
      </div>
    </div>
  );
}

AuthLeftPanel.propTypes = {
  gradient: PropTypes.string.isRequired,
  orb2Color: PropTypes.string.isRequired,
  orb3Color: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default function AuthLayout({ leftPanel, children }) {
  return (
    <div className="flex min-h-screen">
      {leftPanel}
      <div className="flex w-full items-center justify-center bg-background p-6 lg:w-1/2 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="mb-8 text-center lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-black text-white shadow-lg shadow-indigo-500/25">
                T
              </div>
              <span className="font-display text-xl font-bold tracking-tight">TAC-TIC</span>
            </Link>
          </div>

          <div className="rounded-2xl border-0 bg-card/80 p-8 shadow-2xl backdrop-blur-sm lg:bg-card lg:backdrop-blur-none">
            {children}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} TAC-TIC &mdash; Groupe New Ways
          </p>
        </motion.div>
      </div>
    </div>
  );
}

AuthLayout.propTypes = {
  leftPanel: PropTypes.node,
  children: PropTypes.node.isRequired,
};
