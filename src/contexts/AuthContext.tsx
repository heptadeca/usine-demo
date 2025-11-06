import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Client } from '../lib/supabase';

type AuthContextType = {
  client: Client | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<Client | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadClientProfile(session.user.id);
        setToken(session.access_token);
      } else {
        setClient(null);
        setToken(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadClientProfile(session.user.id);
        setToken(session.access_token);
      } else {
        setLoading(false);
      }
    });
  }, []);

  async function loadClientProfile(userId: string) {
    try {
      const { data: clientData, error } = await supabase
        .from('clients')
        .select('id, email, role')
        .eq('id', userId)
        .maybeSingle();

      if (!error && clientData) {
        setClient(clientData);
      }
    } catch (error) {
      console.error('Failed to load client profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      await loadClientProfile(data.user.id);
      setToken(data.session?.access_token || null);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setToken(null);
    setClient(null);
  }

  return (
    <AuthContext.Provider value={{ client, token, login, logout, loading }}>
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
