import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api';

export type Role = 'ADMIN' | 'TEACHER' | 'PARENT' | 'STUDENT' | 'OFFICE';
export interface User { id: number; name: string; role: Role; username: string }
export interface StudentInfo { id: number; name: string; hero: string; class_id: number; class_name: string; band: 'JUNIOR' | 'MIDDLE' | 'SENIOR' }

interface AuthState {
  user: User | null;
  student: StudentInfo | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api('/me')
      .then((d) => { setUser(d.user); setStudent(d.student); })
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const d = await api('/auth/login', { method: 'POST', body: { username, password } });
    setToken(d.token);
    setUser(d.user);
    const me = await api('/me');
    setStudent(me.student);
  }
  function logout() { setToken(null); setUser(null); setStudent(null); }

  return <Ctx.Provider value={{ user, student, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
