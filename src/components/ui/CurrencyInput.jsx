// FinTrack RD — CurrencyInput Component
// Formatted currency input that displays 1,000.00 while typing

import { useState, useEffect, useRef } from 'react';

/**
 * Formats a numeric value with thousands separators and 2 decimal places
 * Uses Dominican format: 1,000.00
 */
function formatDisplay(value) {
  if (value === '' || value === null || value === undefined) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Strips formatting characters to get raw numeric string
 */
function stripFormat(str) {
  return str.replace(/,/g, '');
}

export default function CurrencyInput({
  value,
  onChange,
  onBlurCallback,
  placeholder = '0.00',
  required = false,
  min,
  style = {},
  autoFocus = false,
  id,
}) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Sync external value → display when not focused
  useEffect(() => {
    if (!isFocused) {
      if (value === '' || value === null || value === undefined) {
        setDisplayValue('');
      } else {
        setDisplayValue(formatDisplay(value));
      }
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw number for easier editing
    if (value !== '' && value !== null && value !== undefined) {
      const num = parseFloat(value);
      if (!isNaN(num) && num !== 0) {
        setDisplayValue(num.toString());
      } else if (num === 0) {
        setDisplayValue('');
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format on blur
    const raw = stripFormat(displayValue);
    const num = parseFloat(raw);
    let finalVal = '';
    if (!isNaN(num)) {
      finalVal = num.toString();
      setDisplayValue(formatDisplay(num));
      onChange(finalVal);
    } else {
      setDisplayValue('');
      onChange('');
    }
    // Notify parent of blur event
    if (onBlurCallback) onBlurCallback(finalVal);
  };

  const handleChange = (e) => {
    let input = e.target.value;

    // Allow only digits, dots, and commas during typing
    input = input.replace(/[^0-9.,]/g, '');

    // Prevent multiple dots
    const parts = input.split('.');
    if (parts.length > 2) {
      input = parts[0] + '.' + parts.slice(1).join('');
    }

    setDisplayValue(input);

    // Parse and notify parent
    const raw = stripFormat(input);
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      onChange(num.toString());
    } else if (input === '' || input === '.') {
      onChange('');
    }
  };

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      required={required}
      autoFocus={autoFocus}
      style={style}
      autoComplete="off"
    />
  );
}
