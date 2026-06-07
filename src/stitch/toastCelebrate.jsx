// Toast de celebración con emoji JoyPixels (no el emoji nativo del SO).
// react-hot-toast renderiza el mensaje como contenido, así que pasamos JSX con
// <Emoji> para mantener la coherencia visual de JoyPixels en toda la app.
import toast from 'react-hot-toast';
import Emoji from './Emoji';

// Muestra un toast de éxito con el 🎉 renderizado en JoyPixels.
// `emoji` permite otro carácter si se quiere (default 🎉).
export function toastCelebrate(message, { emoji = '🎉', duration = 4000 } = {}) {
  return toast.success(
    <span className="flex items-center gap-xs">
      <Emoji e={emoji} size={16} />
      {message}
    </span>,
    { duration }
  );
}
