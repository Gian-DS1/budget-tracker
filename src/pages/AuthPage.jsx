import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { TrendingUp } from 'lucide-react';

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle, resetPassword, updatePassword, isRecoveringPassword } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot_password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const currentMode = isRecoveringPassword ? 'update_password' : mode;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentMode !== 'forgot_password' && !password) {
      toast.error('Por favor, ingresa una contraseña.');
      return;
    }

    if ((currentMode === 'signup' || currentMode === 'update_password') && password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (currentMode === 'login') {
        await signIn(email, password);
        toast.success('¡Bienvenido de vuelta!');
      } else if (currentMode === 'signup') {
        await signUp(email, password);
        toast.success('Cuenta creada exitosamente. Revisa tu correo o inicia sesión.');
        setMode('login');
      } else if (currentMode === 'forgot_password') {
        await resetPassword(email);
        toast.success('Correo de recuperación enviado. Revisa tu bandeja de entrada.');
        setMode('login');
      } else if (currentMode === 'update_password') {
        await updatePassword(password);
        toast.success('Contraseña actualizada exitosamente.');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Ocurrió un error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: 'var(--space-8)', borderTop: '4px solid var(--accent-primary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div 
            className="flex items-center justify-center mb-4" 
            style={{ 
              width: 50, height: 50, 
              background: 'var(--accent-primary)', 
              borderRadius: 'var(--radius-md)',
              color: 'white'
            }}
          >
            <TrendingUp size={28} />
          </div>
          <h1 className="text-2xl font-bold">FinTrack RD</h1>
        </div>

        {(currentMode === 'login' || currentMode === 'signup') && (
          <div style={{ width: '100%', marginBottom: '1.5rem' }}>
            <button 
              type="button"
              onClick={async () => {
                try {
                  await signInWithGoogle();
                } catch (error) {
                  toast.error(error.message || 'Error con Google');
                }
              }}
              className="btn auth-btn-google w-full flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-secondary)' }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>
            <div className="flex items-center gap-4 mt-6 text-sm text-muted">
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-primary)' }}></div>
              <span>o con correo</span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-primary)' }}></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {currentMode !== 'update_password' && (
            <div className="form-group">
              <label className="form-label">Correo Electrónico</label>
              <input 
                type="email" 
                className="form-control" 
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          )}

          {currentMode !== 'forgot_password' && (
            <div className="form-group">
              <label className="form-label">
                {currentMode === 'update_password' ? 'Nueva Contraseña' : 'Contraseña'}
              </label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          {currentMode === 'login' && (
            <div className="text-right mt-1">
              <button 
                type="button" 
                className="auth-link text-xs"
                onClick={() => setMode('forgot_password')}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          <div className="flex justify-center mt-6">
            <button 
              type="submit" 
              className="btn btn-primary auth-btn"
              disabled={loading}
            >
              {loading ? 'Cargando...' : 
               currentMode === 'login' ? 'Iniciar Sesión' : 
               currentMode === 'signup' ? 'Crear Cuenta' : 
               currentMode === 'forgot_password' ? 'Enviar Enlace' :
               'Guardar Contraseña'}
            </button>
          </div>
        </form>

        {!isRecoveringPassword && (
          <div className="mt-6 text-center text-sm text-muted flex flex-col gap-2">
            {currentMode === 'forgot_password' ? (
              <button 
                type="button"
                className="auth-link"
                onClick={() => setMode('login')}
              >
                Volver a Iniciar Sesión
              </button>
            ) : (
              <div>
                {currentMode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?'}{' '}
                <button 
                  type="button"
                  className="auth-link"
                  onClick={() => setMode(currentMode === 'login' ? 'signup' : 'login')}
                >
                  {currentMode === 'login' ? 'Regístrate aquí' : 'Inicia Sesión'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
