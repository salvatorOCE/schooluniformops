'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type SessionRole = 'admin' | 'school' | null;

interface SessionContextType {
  role: SessionRole;
  schoolCode: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<SessionRole>(null);
  const [schoolCode, setSchoolCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      setRole(data.role ?? null);
      setSchoolCode(data.schoolCode ?? null);
    } catch {
      setRole(null);
      setSchoolCode(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  return (
    <SessionContext.Provider value={{ role, schoolCode, loading, refetch: fetchSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
