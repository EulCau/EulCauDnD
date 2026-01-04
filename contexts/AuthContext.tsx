import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  register: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('dnd_current_user');
    if (savedUser) {
      setUser({ username: savedUser });
    }
  }, []);

  const login = (username: string, password: string) => {
    const users = JSON.parse(localStorage.getItem('dnd_users') || '{}');
    if (users[username] === password) {
      setUser({ username });
      localStorage.setItem('dnd_current_user', username);
      return true;
    }
    return false;
  };

  const register = (username: string, password: string) => {
    const users = JSON.parse(localStorage.getItem('dnd_users') || '{}');
    if (users[username]) {
      return false; // User exists
    }
    users[username] = password;
    localStorage.setItem('dnd_users', JSON.stringify(users));
    
    // Auto login
    setUser({ username });
    localStorage.setItem('dnd_current_user', username);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dnd_current_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};