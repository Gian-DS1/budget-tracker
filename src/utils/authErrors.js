// FinTrack RD — Traducción de errores de autenticación a español plano.
//
// Supabase devuelve mensajes en inglés y a veces técnicos. Esta función los
// mapea a un mensaje claro y accionable para el usuario; si no reconoce el
// error, devuelve un mensaje genérico amable (el error crudo queda en consola).

export function friendlyAuthError(error) {
  const raw = (error?.message || '').toLowerCase();

  // Sin conexión / problemas de red.
  if (raw.includes('failed to fetch') || raw.includes('networkerror') || raw.includes('network request failed')) {
    return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
  }

  // Credenciales inválidas al iniciar sesión.
  if (raw.includes('invalid login credentials') || raw.includes('invalid credentials')) {
    return 'Correo o contraseña incorrectos.';
  }

  // Correo no confirmado.
  if (raw.includes('email not confirmed') || raw.includes('not confirmed')) {
    return 'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.';
  }

  // Cuenta ya existente al registrarse.
  if (raw.includes('already registered') || raw.includes('user already exists')) {
    return 'Ya existe una cuenta con este correo. Inicia sesión.';
  }

  // Contraseña débil.
  if (raw.includes('password should be at least') || raw.includes('password is too short')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }

  // Demasiados intentos.
  if (raw.includes('rate limit') || raw.includes('too many requests')) {
    return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
  }

  // Correo inválido.
  if (raw.includes('invalid email') || raw.includes('unable to validate email')) {
    return 'El correo no parece válido. Revísalo e intenta de nuevo.';
  }

  return 'No pudimos completar la acción. Intenta de nuevo en un momento.';
}
