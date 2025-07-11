import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, googleAuth, logout as authLogout, getCurrentUser, initializeAuth } from '../services/auth';
import { setUser as setSentryUser, clearUser as clearSentryUser } from '../config/sentry';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        initializeAuth();
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        // Set user in Sentry for error tracking
        if (currentUser) {
          setSentryUser({
            id: currentUser.id,
            email: currentUser.email,
            username: currentUser.username
          });
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const googleLogin = async (credential: string) => {
    const { user } = await googleAuth(credential);
    setUser(user);
    // Set user in Sentry for error tracking
    setSentryUser({
      id: user.id,
      email: user.email,
      username: user.username
    });
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
    // Clear user from Sentry
    clearSentryUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};