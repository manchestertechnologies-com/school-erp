import React, { useEffect, useState } from 'react';
import { api } from './lib/api';
import { useAuth } from './lib/auth';
import { Login } from './pages/Login';
import { JungleWorld } from './pages/junior/JungleWorld';
import { HeroAcademy } from './pages/middle/HeroAcademy';
import { StudyHub } from './pages/senior/StudyHub';
import { AdminPortal } from './pages/portals/AdminPortal';
import { TeacherPortal } from './pages/portals/TeacherPortal';
import { OfficePortal } from './pages/portals/OfficePortal';
import { ParentPortal } from './pages/portals/ParentPortal';
import { useApi } from './pages/portals/common';
import { ModelSheet } from './pages/ModelSheet';
import { MascotLoader } from './components/Speech';

export function App() {
  const { user, student, loading, logout } = useAuth();
  const [parentView, setParentView] = useState<null | { studentId: number }>(null);

  if (window.location.pathname === '/model-sheet') return <ModelSheet />;
  if (loading) return <MascotLoader label="Loading Manchester Technologies…" />;
  if (!user) return <Login />;

  if (user.role === 'STUDENT' && student) {
    if (student.band === 'JUNIOR') return <JungleWorld studentId={student.id} studentName={student.name} hero={student.hero} onExit={logout} />;
    if (student.band === 'MIDDLE') return <HeroAcademy studentId={student.id} studentName={student.name} hero={student.hero} className={student.class_name} onExit={logout} />;
    return <StudyHub studentId={student.id} studentName={student.name} className={student.class_name} onExit={logout} />;
  }
  if (user.role === 'PARENT') return <ParentEntry />;
  if (user.role === 'ADMIN') return <AdminPortal />;
  if (user.role === 'TEACHER') return <TeacherPortal />;
  if (user.role === 'OFFICE') return <OfficePortal />;
  return <div className="empty">This account has no portal yet.</div>;
}

/** Parent-supervised view of a junior child's world. */
function JungleWorldForChild({ studentId, onBack }: { studentId: number; onBack: () => void }) {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    api(`/students/${studentId}/summary`).then((d) => setName(d.student.name)).catch(() => setName('Your child'));
  }, [studentId]);
  if (!name) return <div className="empty" style={{ padding: 80 }}>Opening the jungle…</div>;
  return <JungleWorld studentId={studentId} studentName={name} hero="nova" onExit={onBack} exitLabel="Back to parent portal" supervised />;
}

/** A parent lands straight in the child's interface: Momo's Jungle for Nursery–3, Hero Academy for Classes 4–7, otherwise the parent portal. */
function ParentEntry() {
  const kids = useApi<any[]>('/students');
  const [view, setView] = useState<'auto' | 'portal'>('auto');
  if (kids.error) return <div className="error" style={{ margin: 24 }}>{kids.error}</div>;
  const child = kids.data?.[0];
  if (!child) return <MascotLoader label="Opening your child’s world…" />;
  if (view === 'auto' && child.band === 'JUNIOR') return <JungleWorldForChild studentId={child.id} onBack={() => setView('portal')} />;
  if (view === 'auto' && child.band === 'MIDDLE') return <HeroAcademy studentId={child.id} studentName={child.name} hero={child.hero || 'nova'} className={child.class_name} onExit={() => setView('portal')} />;
  return <ParentPortal onOpenJungle={() => setView('auto')} />;
}
