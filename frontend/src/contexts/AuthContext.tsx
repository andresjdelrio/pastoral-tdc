import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          // Try to decode mock token first
          try {
            const decoded = JSON.parse(atob(token));
            if (decoded.username && decoded.role && decoded.exp > Date.now()) {
              setUser({
                id: '1',
                username: decoded.username,
                role: decoded.role
              });
              setIsLoading(false);
              return;
            }
          } catch (mockError) {
            // Not a mock token, try API verification
          }

          // Try API verification
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData.user);
          } else {
            localStorage.removeItem('auth_token');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('auth_token');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log('Login attempt:', { username, password });

      // Client-side authentication for demo (no backend required)
      if (username === 'admin' && password === 'pastoral2024') {
        console.log('Client-side auth successful');
        // Generate a mock token
        const mockToken = btoa(JSON.stringify({
          username: 'admin',
          role: 'admin',
          exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        }));

        const userData = {
          id: '1',
          username: 'admin',
          role: 'admin' as const
        };

        localStorage.setItem('auth_token', mockToken);
        setUser(userData);
        console.log('User set:', userData);
        return true;
      }

      console.log('Credentials do not match admin/pastoral2024');

      // Try API if available (for future backend integration)
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('auth_token', data.token);
          setUser(data.user);
          return true;
        }
      } catch (apiError) {
        console.log('API not available, using client-side auth');
      }

      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}