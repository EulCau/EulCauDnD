import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login, register } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    const success = isLogin ? login(username, password) : register(username, password);
    
    if (!success) {
      setError(isLogin ? 'Invalid credentials' : 'Username already taken');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-gray-200">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-gray-800">
            {t(isLogin ? 'auth.login' : 'auth.register')}
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
            />
          </div>
          <div>
            <label className="block text-xs uppercase font-bold text-gray-500 mb-1">{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-b border-gray-300 p-2 outline-none focus:border-dnd-gold bg-transparent"
            />
          </div>
          
          <button 
            type="submit"
            className="mt-4 bg-dnd-red text-white py-2 rounded font-bold hover:bg-red-900 transition-colors"
          >
            {t(isLogin ? 'auth.login' : 'auth.register')}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          {t(isLogin ? 'auth.noAccount' : 'auth.haveAccount')}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="ml-2 text-dnd-gold font-bold hover:underline"
          >
            {t(isLogin ? 'auth.register' : 'auth.login')}
          </button>
        </div>
      </div>
    </div>
  );
};