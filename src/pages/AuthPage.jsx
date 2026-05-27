import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { TrendingUp } from 'lucide-react';

export default function AuthPage() {
  const { signIn, signUp, resetPassword, updatePassword, isRecoveringPassword } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot_password'
  
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
                className="text-xs text-accent bg-transparent border-none cursor-pointer hover:underline"
                onClick={() => setMode('forgot_password')}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          <div className="flex justify-center mt-6">
            <button 
              type="submit" 
              className="btn btn-primary"
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
                className="text-accent font-bold hover:underline bg-transparent border-none cursor-pointer"
                onClick={() => setMode('login')}
              >
                Volver a Iniciar Sesión
              </button>
            ) : (
              <div>
                {currentMode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?'}{' '}
                <button 
                  type="button"
                  className="text-accent font-bold hover:underline bg-transparent border-none cursor-pointer"
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
