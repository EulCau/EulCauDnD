import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface ThemeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
}

const SunIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDarkMode, onToggle }) => {
  const { t } = useLanguage();
  const label = isDarkMode ? t('theme.switchToLight') : t('theme.switchToDark');

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={isDarkMode}
      title={label}
      className="fixed right-4 top-4 z-[100] grid h-10 w-10 place-items-center rounded-full border border-gray-300 bg-white text-gray-700 shadow-md transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-dnd-gold focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-900"
    >
      {isDarkMode ? <SunIcon /> : <MoonIcon />}
    </button>
  );
};
