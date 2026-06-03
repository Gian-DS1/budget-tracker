// Pantalla de acceso (login / registro / recuperación) en estilo Stitch, español.
// Usa AuthContext real (Supabase). Estética: card glass periwinkle sobre canvas #070708.

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { friendlyAuthError } from '../../utils/authErrors';
import { isLocalhost, enterDemo } from '../demoMode';
import MS from '../MS';
import Logo from '../Logo';

const MODES = { login: 'login', signup: 'signup', reset: 'reset' };

export default function StitchAuth() {
  const { signIn, signUp, signInWithGoogle, resetPassword, updatePassword, isRecoveringPassword } = useAuth();
  const [mode, setMode] = useState(MODES.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Llegada desde el email de recuperación: establecer nueva contraseña.
  if (isRecoveringPassword) {
    return <NewPasswordScreen updatePassword={updatePassword} />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === MODES.login) {
        await signIn(email, password);
      } else if (mode === MODES.signup) {
        await signUp(email, password);
        toast.success('Cuenta creada. Revisa tu correo para confirmar.');
      } else {
        await resetPassword(email);
        setResetSent(true); // muestra confirmación en pantalla (no solo toast)
      }
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try { await signInWithGoogle(); } catch (err) { toast.error(friendlyAuthError(err)); setBusy(false); }
  };

  return (
    <div className="stitch-root grid-pattern min-h-screen flex items-center justify-center p-margin-safe">
      <div className="w-full max-w-[420px] bg-surface-card border border-border-subtle rounded-lg inner-glow p-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" style={{ boxShadow: '0 0 15px rgba(190,194,255,0.4)' }} />

        {/* Marca */}
        <div className="flex flex-col items-center text-center mb-lg pt-sm">
          <Logo size={48} className="mb-md" />
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">FinTrack</h1>
          <p className="font-mono-data text-mono-data text-text-muted uppercase tracking-widest mt-xs">
            {mode === MODES.login ? 'Acceso al sistema' : mode === MODES.signup ? 'Crear cuenta' : 'Recuperar acceso'}
          </p>
        </div>

        {/* Confirmación de recuperación enviada */}
        {resetSent ? (
          <div className="flex flex-col items-center text-center gap-md py-md">
            <span className="w-12 h-12 rounded-full bg-tertiary/10 border border-tertiary/30 flex items-center justify-center">
              <MS name="mark_email_read" className="text-[24px] text-tertiary" />
            </span>
            <p className="font-body-md text-body-md text-on-surface">Revisa tu correo</p>
            <p className="font-mono-data text-mono-data text-text-muted normal-case tracking-normal">Te enviamos un enlace a <span className="text-on-surface-variant">{email}</span> para restablecer tu contraseña. Si no lo ves, revisa el spam.</p>
            <button onClick={() => { setResetSent(false); setMode(MODES.login); }} className="mt-sm font-label-sm text-label-sm text-primary hover:text-primary-container transition-colors">Volver al acceso</button>
          </div>
        ) : (
        <>
        {/* Google */}
        {mode !== MODES.reset && (
          <>
            <button
              onClick={handleGoogle}
              disabled={busy}
              className="w-full flex items-center justify-center gap-sm bg-surface-container-lowest border border-border-subtle text-on-surface font-label-sm text-label-sm py-sm rounded hover:bg-surface-container-high transition-colors inner-glow disabled:opacity-50"
            >
              <GoogleG /> Continuar con Google
            </button>
            <div className="flex items-center gap-sm my-md">
              <div className="flex-1 h-px bg-border-subtle" />
              <span className="font-mono-data text-mono-data text-text-muted uppercase">o con correo</span>
              <div className="flex-1 h-px bg-border-subtle" />
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <label className="font-mono-data text-mono-data text-text-muted uppercase" htmlFor="email">Correo electrónico</label>
            <input
              id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary inner-glow placeholder:text-text-muted"
            />
          </div>

          {mode !== MODES.reset && (
            <div className="flex flex-col gap-xs">
              <label className="font-mono-data text-mono-data text-text-muted uppercase" htmlFor="password">Contraseña</label>
              <input
                id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary inner-glow placeholder:text-text-muted"
              />
            </div>
          )}

          {mode === MODES.login && (
            <button type="button" onClick={() => setMode(MODES.reset)} className="self-end font-label-sm text-label-sm text-primary hover:text-primary-container transition-colors">
              ¿Olvidaste tu contraseña?
            </button>
          )}

          <button
            type="submit" disabled={busy}
            className="w-full bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold py-sm rounded hover:bg-primary-container transition-colors inner-glow disabled:opacity-50 mt-xs"
          >
            {busy ? 'Procesando…' : mode === MODES.login ? 'Iniciar sesión' : mode === MODES.signup ? 'Crear cuenta' : 'Enviar enlace'}
          </button>
        </form>

        {/* Switch */}
        <div className="text-center mt-lg font-body-md text-body-md text-text-muted">
          {mode === MODES.login ? (
            <>¿No tienes cuenta?{' '}
              <button onClick={() => setMode(MODES.signup)} className="text-primary font-bold hover:text-primary-container transition-colors">Regístrate</button>
            </>
          ) : (
            <>¿Ya tienes cuenta?{' '}
              <button onClick={() => setMode(MODES.login)} className="text-primary font-bold hover:text-primary-container transition-colors">Inicia sesión</button>
            </>
          )}
        </div>
        </>
        )}

        {/* Modo QA — solo localhost. Entra con datos demo sin tocar el backend. */}
        {isLocalhost() && (
          <div className="mt-lg pt-md border-t border-border-subtle">
            <button
              onClick={() => { enterDemo(); window.location.reload(); }}
              className="w-full flex items-center justify-center gap-sm border border-dashed border-border-subtle text-on-surface-variant font-mono-data text-mono-data uppercase tracking-widest py-sm rounded hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              <MS name="science" className="text-[16px]" /> Entrar como demo (QA local)
            </button>
            <p className="text-center font-mono-data text-[9px] text-text-muted mt-xs uppercase">Datos de ejemplo · no toca el backend</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Pantalla de nueva contraseña (tras llegar del email de recuperación).
function NewPasswordScreen({ updatePassword }) {
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pwd.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    if (pwd !== pwd2) { toast.error('Las contraseñas no coinciden'); return; }
    setBusy(true);
    try {
      await updatePassword(pwd);
      toast.success('Contraseña actualizada. Ya puedes entrar.');
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="stitch-root grid-pattern min-h-screen flex items-center justify-center p-margin-safe">
      <div className="w-full max-w-[420px] bg-surface-card border border-border-subtle rounded-lg inner-glow p-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" style={{ boxShadow: '0 0 15px rgba(190,194,255,0.4)' }} />
        <div className="flex flex-col items-center text-center mb-lg pt-sm">
          <div className="w-12 h-12 rounded bg-surface-container-high border border-border-subtle flex items-center justify-center inner-glow mb-md">
            <MS name="lock_reset" className="text-[24px] text-primary" />
          </div>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">Nueva contraseña</h1>
          <p className="font-mono-data text-mono-data text-text-muted uppercase tracking-widest mt-xs">Restablecer acceso</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <label className="font-mono-data text-mono-data text-text-muted uppercase" htmlFor="np1">Nueva contraseña</label>
            <input id="np1" type="password" required value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" className="bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary inner-glow placeholder:text-text-muted" />
          </div>
          <div className="flex flex-col gap-xs">
            <label className="font-mono-data text-mono-data text-text-muted uppercase" htmlFor="np2">Confirmar contraseña</label>
            <input id="np2" type="password" required value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="••••••••" className="bg-surface-container-lowest border border-border-subtle rounded py-sm px-md font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary inner-glow placeholder:text-text-muted" />
          </div>
          <button type="submit" disabled={busy} className="w-full bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-widest font-bold py-sm rounded hover:bg-primary-container transition-colors inner-glow disabled:opacity-50 mt-xs">
            {busy ? 'Guardando…' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Logo oficial de Google (colores de marca, NO tematizar).
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
