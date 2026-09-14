import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

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
    let resolved = false;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      resolved = true;
      if (currentUser) {
        setUser(currentUser);
        try {
          localStorage.removeItem('enlace_dooria_demo_user');
        } catch {}
      }
      setLoading(false);
    });

    // Timeout de segurança para evitar tela travada em carregamento no iframe
    const safetyTimer = setTimeout(() => {
      if (!resolved) {
        setLoading(false);
      }
    }, 1500);

    return () => {
      unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error('Erro ao fazer login com Google:', error);
      // Fallback para usuário demo em caso de bloqueio de popup pelo iframe
      loginAsDemoUser('super_admin');
    }
  };

  const loginAsDemoUser = (role: 'morador' | 'sindico' | 'super_admin' = 'super_admin') => {
    const demoUser = {
      uid: 'dev-admin-user',
      displayName: role === 'super_admin' ? 'Engenharia / Super Admin' : role === 'sindico' ? 'Síndico Gestor' : 'Carlos Mendes (Morador 101)',
      email: role === 'super_admin' ? 'sevillacond@gmail.com' : 'carlos.mendes@gmail.com',
      photoURL: '',
    } as unknown as User;

    setUser(demoUser);
    try {
      localStorage.setItem('enlace_dooria_demo_user', JSON.stringify(demoUser));
    } catch {}
  };

  const logout = async () => {
    try {
      localStorage.removeItem('enlace_dooria_demo_user');
      await signOut(auth);
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
