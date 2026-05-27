import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { TrendingUp } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Por favor, completa todos los campos.');
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        toast.success('¡Bienvenido de vuelta!');
      } else {
        await signUp(email, password);
        toast.success('Cuenta creada exitosamente. Revisa tu correo o inicia sesión.');
        // Auto-switch to login after signup
        setIsLogin(true);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Ocurrió un error al autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="card w-full max-w-md p-8" style={{ borderTop: '4px solid var(--accent-primary)' }}>
        <div className="flex flex-col items-center mb-8">
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
          <p className="text-muted text-sm text-center mt-2">
            Control financiero inteligente y predictivo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full justify-center mt-6"
            disabled={loading}
          >
            {loading ? 'Cargando...' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?'}{' '}
          <button 
            type="button"
            className="text-accent font-bold hover:underline bg-transparent border-none cursor-pointer"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Regístrate aquí' : 'Inicia Sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}
