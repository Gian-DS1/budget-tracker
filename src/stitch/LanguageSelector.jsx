import { useState, useRef, useEffect } from 'react';
import MS from './MS';
import { useI18n } from '../contexts/I18nContext';

export default function LanguageSelector() {
  const { language, changeLanguage, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar el dropdown al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const languages = [
    { code: 'es', label: t('settings.spanish'), flag: '🇩🇴' },
    { code: 'en', label: t('settings.english'), flag: '🇺🇸' },
  ];

  const currentLang = languages.find((l) => l.code === language);

  const handleChangeLanguage = (code) => {
    changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-xs px-md py-sm rounded border border-border-subtle hover:bg-surface-container-highest transition-colors duration-200"
        aria-label={t('settings.language')}
        title={t('settings.language')}
      >
        <span className="text-[16px]">{currentLang?.flag}</span>
        <span className="font-label-sm text-label-sm text-on-surface hidden sm:inline uppercase tracking-widest">
          {language === 'es' ? 'ES' : 'EN'}
        </span>
        <MS
          name={isOpen ? 'expand_less' : 'expand_more'}
          className="text-[18px] text-text-muted"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-xs bg-surface-panel border border-border-subtle rounded shadow-lg z-50 min-w-[140px]">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleChangeLanguage(lang.code)}
              className={[
                'w-full px-md py-sm text-left font-label-sm text-label-sm uppercase tracking-widest transition-colors duration-200 flex items-center gap-sm',
                language === lang.code
                  ? 'bg-surface-container-highest text-primary font-bold'
                  : 'text-on-surface hover:bg-surface-container-highest',
              ].join(' ')}
            >
              <span className="text-[16px]">{lang.flag}</span>
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
