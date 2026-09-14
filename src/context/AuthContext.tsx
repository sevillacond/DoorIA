import React, { createContext, useContext, useState, useEffect } from 'react';

// Representação simples de um usuário para manter compatibilidade
export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role?: 'morador' | 'sindico' | 'super_admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsDemoUser: (role?: 'morador' | 'sindico' | 'super_admin') => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithGoogle: async () => {},
  loginAsDemoUser: () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('enlace_dooria_demo_user');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simula inicialização rápida local (Local-First)
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 200);

    return () => clearTimeout(safetyTimer);
  }, []);

  const loginWithGoogle = async () => {
    // Substituído no ambiente local-first, cai no fallback automático de Super Admin
    console.warn('[Auth] Login externo desativado. Utilizando fallback local-first.');
    loginAsDemoUser('super_admin');
  };

  const loginAsDemoUser = (role: 'morador' | 'sindico' | 'super_admin' = 'super_admin') => {
    const demoUser = {
      uid: `dev-user-${role}`,
      displayName: role === 'super_admin' ? 'Engenharia / Super Admin' : role === 'sindico' ? 'Síndico Gestor' : 'Carlos Mendes (Morador 101)',
      email: role === 'super_admin' ? 'sevillacond@gmail.com' : role === 'sindico' ? 'sindico@solardaspalmeiras.com.br' : 'carlos.mendes@gmail.com',
      photoURL: '',
      role,
    } as unknown as User;

    setUser(demoUser);
    try {
      localStorage.setItem('enlace_dooria_demo_user', JSON.stringify(demoUser));
    } catch {}
  };

  const logout = async () => {
    try {
      localStorage.removeItem('enlace_dooria_demo_user');
      setUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginAsDemoUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
