import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export const AuthScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username) {
      setError('Please enter a username');
      return;
    }

    login(username);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-gray-200">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-gray-800">
            {t('auth.login')}
            </h2>
            <button 
                onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')} 
                className="text-xs font-bold text-gray-400 hover:text-dnd-red transition-colors"
            >
                {language === 'en' ? '中文' : 'EN'}
            </button>
        </div>
        
        {error && <div className="bg-red-50 text-red-600 text-sm p-2 mb-4 rounded">{error}</div>}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs uppercase font-bold text-gray-500 mb-1">{t('auth.username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border-b border-gray-300 p-2 outline-none focus:border-dnd-gold bg-transparent"
              placeholder="Enter your character name or ID"
            />
          </div>
          
          <button 
            type="submit"
            className="mt-4 bg-dnd-red text-white py-2 rounded font-bold hover:bg-red-900 transition-colors"
          >
            {t('auth.login')}
          </button>
        </form>
      </div>
    </div>
  );
};