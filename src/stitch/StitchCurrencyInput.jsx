// Input de moneda con formateo de miles EN VIVO (estilo Stitch).
// Formato dominicano: 1,234.50. Mientras escribes, agrupa miles con comas y
// preserva la posición del cursor contando dígitos a la izquierda del caret.
//
// API: <StitchCurrencyInput value onChange className placeholder ... />
//   - value: string crudo SIN comas (ej. "1234.5") — lo que se guarda.
//   - onChange(raw): recibe el string crudo (sin comas) para el estado del form.

import { useRef } from 'react';

// Agrupa la parte entera con comas, conserva hasta 2 decimales.
function formatLive(raw) {
  if (raw === '' || raw == null) return '';
  // raw ya viene saneado a [0-9.] con un solo punto.
  const neg = raw.startsWith('-');
  let s = neg ? raw.slice(1) : raw;
  let [intPart, decPart] = s.split('.');
  intPart = (intPart || '').replace(/^0+(?=\d)/, ''); // sin ceros a la izquierda
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let out = grouped || (s.startsWith('.') ? '0' : '');
  if (s.includes('.')) out = (out || '0') + '.' + (decPart ?? '').slice(0, 2);
  return (neg ? '-' : '') + out;
}

// Quita todo lo que no sea dígito, punto o signo; un solo punto.
function sanitize(input) {
  let s = input.replace(/[^0-9.]/g, '');
  const parts = s.split('.');
  if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('');
  // máximo 2 decimales
  const [i, d] = s.split('.');
  if (d !== undefined) s = i + '.' + d.slice(0, 2);
  return s;
}

// Cuenta dígitos hasta una posición del string (para reposicionar el caret).
function digitsBefore(str, pos) {
  let n = 0;
  for (let i = 0; i < pos && i < str.length; i++) if (/\d/.test(str[i])) n++;
  return n;
}
function caretFromDigits(formatted, digitCount) {
  if (digitCount <= 0) return 0;
  let n = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      n++;
      if (n === digitCount) return i + 1;
    }
  }
  return formatted.length;
}

export default function StitchCurrencyInput({
  value = '',
  onChange,
  className = '',
  placeholder = '0.00',
  autoFocus = false,
  id,
  inputMode = 'decimal',
  ...rest
}) {
  const ref = useRef(null);

  const handleChange = (e) => {
    const el = e.target;
    const prevCaret = el.selectionStart ?? el.value.length;
    const rawSanitized = sanitize(el.value);
    const formatted = formatLive(rawSanitized);

    // dígitos a la izquierda del caret en el valor que el usuario tecleó
    const typedDigits = digitsBefore(el.value, prevCaret);

    onChange(rawSanitized);

    // Reposicionar el caret tras el re-formateo (en el próximo frame para que el
    // value controlado ya esté aplicado).
    requestAnimationFrame(() => {
      if (!ref.current) return;
      const newCaret = caretFromDigits(formatted, typedDigits);
      try { ref.current.setSelectionRange(newCaret, newCaret); } catch { /* noop */ }
    });
  };

  return (
    <input
      ref={ref}
      id={id}
      type="text"
      inputMode={inputMode}
      autoComplete="off"
      value={formatLive(value)}
      onChange={handleChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={className}
      {...rest}
    />
  );
}
