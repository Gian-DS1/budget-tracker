import React, { createContext, useContext, useEffect, useState } from 'react';
import translations from '../i18n/translations';
import { setRuntimeLanguage } from '../i18n/runtime';

const I18nContext = createContext();

const STORAGE_KEY = 'stitch_language';
const DEFAULT_LANGUAGE = 'es';

function getStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && (stored === 'es' || stored === 'en') ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function setStoredLanguage(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (e) {
    console.warn('Failed to store language preference:', e);
  }
}

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [isInitialized, setIsInitialized] = useState(false);

  // Inicializar desde localStorage al montar
  useEffect(() => {
    const stored = getStoredLanguage();
    setRuntimeLanguage(stored);
    setLanguage(stored);
    setIsInitialized(true);
  }, []);

  const changeLanguage = (lang) => {
    if (lang === 'es' || lang === 'en') {
      setRuntimeLanguage(lang);
      setLanguage(lang);
      setStoredLanguage(lang);
      // Actualizar documento para que herramientas como Google Translate lo detecten
      document.documentElement.lang = lang === 'es' ? 'es-DO' : 'en';
    }
  };

  // Obtener traducción con soporte para claves anidadas
  const t = (key, defaultValue = key) => {
    if (!isInitialized) return defaultValue;

    const keys = key.split('.');
    let value = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value || defaultValue;
  };

  return (
    <I18nContext.Provider value={{ language, changeLanguage, t, isInitialized }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n debe ser usado dentro de I18nProvider');
  }
  return context;
}
