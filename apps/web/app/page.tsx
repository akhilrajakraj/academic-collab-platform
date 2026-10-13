'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type ApiProject = { id: string; name: string; description?: string | null; _count?: { documents: number; members: number } };
type ApiDocument = { id: string; projectId: string; title: string; status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'ARCHIVED'; updatedAt: string; project?: { name: string } };
type DocumentItem = { id: string; projectId: string; title: string; project: string; status: 'Draft' | 'In review' | 'Approved' | 'Archived'; updated: string };
type ApiActivity = { id: string; message: string; createdAt: string; actor?: { displayName: string } | null };
type AuthResponse = { accessToken: string; user: { displayName: string; email: string } };
type ActivityItem = { initials: string; color: string; title: string; action: string; target: string; time: string };

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');

function relativeTime(value: string): string {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

function statusLabel(status: ApiDocument['status']): DocumentItem['status'] {
  switch (status) {
    case 'DRAFT': return 'Draft';
    case 'IN_REVIEW': return 'In review';
    case 'APPROVED': return 'Approved';
    case 'ARCHIVED': return 'Archived';
  }
}

function activityView(activity: ApiActivity): ActivityItem {
  const actor = activity.actor?.displayName || 'Workspace';
  const words = activity.message.match(/^(Created|Updated|Added|Restored|Requested)\s+(.*)$/i);
  return {
    initials: actor.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
    color: actor === 'Demo Student' ? 'green' : 'violet',
    title: actor,
    action: words ? words[1].toLowerCase() : 'recorded an update for',
    target: words ? words[2] : activity.message,
    time: relativeTime(activity.createdAt),
  };
}

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null);
  const [account, setAccount] = useState<{ displayName: string; email: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All documents');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setToken(sessionStorage.getItem('academic-collab-access-token'));
    setAuthLoading(false);
  }, []);

  const apiFetch = useCallback(async (url: string, init: RequestInit = {}) => {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
    });
    if (response.status === 401) {
      sessionStorage.removeItem('academic-collab-access-token');
      setToken(null);
    }
    return response;
  }, [token]);

  useEffect(() => {
    if (!token) { setAccount(null); return; }
    void apiFetch(API_BASE + '/auth/me', { cache: 'no-store' })
      .then(async (response) => { if (response.ok) setAccount(await response.json()); })
      .catch(() => undefined);
  }, [apiFetch, token]);

  const loadWorkspace = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setApiError('');
    try {
      const projectResponse = await apiFetch(`${API_BASE}/projects`, { cache: 'no-store' });
      if (!projectResponse.ok) throw new Error('Could not load projects. Confirm the API and database are running.');
      let nextProjects: ApiProject[] = await projectResponse.json();

      // Create a starter project for a new account.
      if (nextProjects.length === 0) {
        const createResponse = await apiFetch(`${API_BASE}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'AI in Education', description: 'A shared space for research and writing.' }),
        });
        if (!createResponse.ok) throw new Error('The API responded, but the starter project could not be created.');
        const starter: ApiProject = await createResponse.json();
        nextProjects = [starter];
      }
      setProjects(nextProjects);

      const documentGroups = await Promise.all(nextProjects.map(async (project) => {
        const response = await apiFetch(`${API_BASE}/projects/${project.id}/documents`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Could not load documents for “${project.name}”.`);
        const rows: ApiDocument[] = await response.json();
        return rows.map((doc) => ({
          id: doc.id,
          projectId: doc.projectId,
          title: doc.title,
          project: project.name,
          status: statusLabel(doc.status),
          updated: relativeTime(doc.updatedAt),
        }));
      }));
      setDocuments(documentGroups.flat());

      if (nextProjects[0]) {
        const activityResponse = await apiFetch(`${API_BASE}/projects/${nextProjects[0].id}/activity`, { cache: 'no-store' });
        if (activityResponse.ok) {
          const rows: ApiActivity[] = await activityResponse.json();
          setActivities(rows.map(activityView));
        }
      } else {
        setActivities([]);
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'The API is unavailable.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, token]);

  useEffect(() => { if (token) void loadWorkspace(); }, [token, loadWorkspace]);

  const filtered = useMemo(() => documents.filter((doc) =>
    (doc.title.toLowerCase().includes(query.toLowerCase()) || doc.project.toLowerCase().includes(query.toLowerCase())) &&
    (selectedFilter === 'All documents' || doc.status === selectedFilter)
  ), [documents, query, selectedFilter]);

  async function createDocument() {
    const title = newTitle.trim();
    const project = projects[0];
    if (!title || !project || saving) return;
    setSaving(true);
    setNotice('');
    try {
      const response = await apiFetch(`${API_BASE}/projects/${project.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) {
        const message = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(message?.message || 'Document could not be saved. Please try again.');
      }
      const created: ApiDocument = await response.json();
      setDocuments((current) => [{
        id: created.id,
        projectId: created.projectId,
        title: created.title,
        project: project.name,
        status: statusLabel(created.status),
        updated: 'Just now',
      }, ...current]);
      setNewTitle('');
      setShowCreate(false);
      setSelectedFilter('All documents');
      setNotice('Document saved to the database.');
      void loadWorkspace();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Document could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);
    setAuthError('');
    try {
      const response = await fetch(API_BASE + '/auth/' + (authMode === 'login' ? 'login' : 'register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authEmail.trim(),
          password: authPassword,
          ...(authMode === 'register' ? { displayName: authName.trim() } : {}),
        }),
      });
      const result = await response.json().catch(() => ({})) as AuthResponse & { message?: string | string[] };
      if (!response.ok || !result.accessToken) {
        throw new Error(Array.isArray(result.message) ? result.message.join(' ') : result.message || 'Authentication failed.');
      }
      sessionStorage.setItem('academic-collab-access-token', result.accessToken);
      setToken(result.accessToken);
      setAccount(result.user);
      setAuthPassword('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setAuthBusy(false);
    }
  }

  function signOut() {
    sessionStorage.removeItem('academic-collab-access-token');
    setToken(null);
    setAccount(null);
    setProjects([]);
    setDocuments([]);
    setActivities([]);
  }

  const awaitingReview = documents.filter((doc) => doc.status === 'In review').length;
  const totalDocuments = projects.reduce((sum, project) => sum + (project._count?.documents ?? 0), documents.length);
  const collaboratorCount = projects.reduce((sum, project) => sum + (project._count?.members ?? 1), 0);

  if (authLoading) {
    return <main className="auth-shell"><section className="auth-card"><span className="brand-mark">a.</span><p>Loading your secure workspace…</p></section></main>;
  }

  if (!token) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <a className="brand auth-brand" href="#"><span className="brand-mark">a.</span><span>academic<span className="brand-light">collab</span></span></a>
          <p className="eyebrow">{authMode === 'login' ? 'WELCOME BACK' : 'YOUR STUDENT WORKSPACE'}</p>
          <h1>{authMode === 'login' ? 'Good ideas start together.' : 'Make room for your next idea.'}</h1>
          <p className="auth-description">{authMode === 'login' ? 'Sign in to continue working on your academic projects.' : 'Create an account to save projects and documents to your workspace.'}</p>
          {authError && <div className="api-banner" role="alert">{authError}</div>}
          <form className="auth-form" onSubmit={submitAuth}>
            {authMode === 'register' && <label>Display name<input autoComplete="name" value={authName} onChange={(event) => setAuthName(event.target.value)} minLength={2} maxLength={80} required placeholder="Your name" /></label>}
            <label>Email address<input type="email" autoComplete="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required maxLength={254} placeholder="you@example.com" /></label>
            <label>Password<input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} minLength={authMode === 'register' ? 10 : 1} maxLength={128} required placeholder={authMode === 'register' ? 'At least 10 characters' : 'Your password'} /></label>
            <button className="primary-button auth-submit" type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'} <span>→</span></button>
          </form>
          <p className="auth-switch">{authMode === 'login' ? 'New to Academic Collab?' : 'Already have an account?'} <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}>{authMode === 'login' ? 'Create an account' : 'Sign in instead'}</button></p>
          <p className="auth-footnote">Development release · Passwords are hashed by the API. Use a unique password; production deployment still needs rate limiting, email verification, and account recovery.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Academic Collab home"><span className="brand-mark">a.</span><span>academic<span className="brand-light">collab</span></span></a>
        <div className="workspace-switch"><span className="workspace-avatar">AC</span><span className="workspace-copy"><strong>Student workspace</strong><small>Local demo</small></span><span className="chevron">⌄</span></div>
        <p className="nav-label">WORKSPACE</p>
        <nav className="navigation" aria-label="Main navigation">
          <a className="nav-item active" href="#overview"><span>▦</span> Overview</a>
          <a className="nav-item" href="#projects"><span>◫</span> My projects <span className="nav-count">{projects.length}</span></a>
          <a className="nav-item" href="#documents"><span>▤</span> Documents</a>
          <a className="nav-item" href="#shared"><span>♧</span> Shared with me</a>
        </nav>
        <p className="nav-label second-label">YOUR PROJECTS <button className="tiny-add" onClick={() => setNotice('Project creation is the next UI workflow; use POST /api/v1/projects for now.')} aria-label="Project creation info">+</button></p>
        <nav className="navigation project-navigation" aria-label="Your projects">
          {projects.map((project, index) => <a className="nav-item project-link" href={`#project-${project.id}`} key={project.id}><span className={`project-dot ${['dot-purple', 'dot-blue', 'dot-orange'][index % 3]}`} /> {project.name}</a>)}
          {!projects.length && !loading && <span className="nav-item project-link">No projects yet</span>}
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><span className="help-icon">✳</span><strong>Need a hand?</strong><p>Explore guides to make your next project better.</p><a href="#guides">Browse learning guides <span>↗</span></a></div><div className="profile-button"><span className="profile-avatar">{(account?.displayName || "My Account").split(/\\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><span className="profile-copy"><strong>{account?.displayName || "My account"}</strong><small>{account?.email || "Signed-in account"}</small></span><button className="signout-small" onClick={signOut}>Sign out</button></div></div>
      </aside>

      <section className="main-panel" id="overview">
        <header className="topbar"><div className="breadcrumbs">Workspace <span>/</span> <strong>Overview</strong></div><div className="topbar-actions"><button className="icon-button" aria-label="Help">?</button><button className="notification-button" aria-label="Notifications">♧<i /></button><button className="top-avatar signout-avatar" onClick={signOut} aria-label="Sign out">↗</button></div></header>
        <div className="page-content">
          <section className="welcome-row"><div><p className="eyebrow">YOUR COLLABORATION WORKSPACE</p><h1>Your ideas, <span>taking shape.</span></h1><p className="welcome-subtitle">Pick up where you left off or start something new with your team.</p></div><button className="primary-button" onClick={() => { setNotice(''); setShowCreate(true); }} disabled={!projects.length || loading}><span>＋</span> New document</button></section>
          {apiError && <div className="api-banner" role="alert"><strong>API connection issue</strong><span>{apiError}</span><button onClick={() => void loadWorkspace()}>Retry connection</button><small>Start PostgreSQL and the API, then refresh. The dashboard no longer pretends unsaved demo records are persisted.</small></div>}
          {notice && <div className={`notice-banner ${notice.includes('could not') || notice.includes('next UI') ? 'notice-warning' : ''}`} role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
          <section className="stats-grid" aria-label="Workspace summary">
            <article className="stat-card"><div className="stat-top"><span>Active projects</span><span className="stat-icon purple-icon">◫</span></div><div className="stat-value">{projects.length}</div><div className="stat-foot">Projects in your workspace</div></article>
            <article className="stat-card"><div className="stat-top"><span>Total documents</span><span className="stat-icon blue-icon">▤</span></div><div className="stat-value">{totalDocuments}</div><div className="stat-foot">Across all your projects</div></article>
            <article className="stat-card"><div className="stat-top"><span>Awaiting review</span><span className="stat-icon amber-icon">◷</span></div><div className="stat-value">{awaitingReview}</div><div className="stat-foot">Documents in review</div></article>
            <article className="stat-card"><div className="stat-top"><span>Memberships</span><span className="stat-icon green-icon">♧</span></div><div className="stat-value">{collaboratorCount}</div><div className="stat-foot">Project memberships</div></article>
          </section>
          <section className="content-grid">
            <div className="documents-section" id="documents">
              <div className="section-heading"><div><h2>Recent documents</h2><p>Your team’s work, all in one place.</p></div><a href="#all-documents">View all <span>→</span></a></div>
              <div className="document-toolbar"><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents..." aria-label="Search documents" /></label><label className="filter-select"><span className="sr-only">Filter documents</span><select value={selectedFilter} onChange={(event) => setSelectedFilter(event.target.value)}><option>All documents</option><option>Draft</option><option>In review</option><option>Approved</option><option>Archived</option></select></label></div>
              <div className="document-list">{loading ? <div className="empty-state"><strong>Loading your workspace…</strong><p>Connecting to the project API.</p></div> : filtered.map((doc) => <article className="document-row" key={doc.id}><div className="document-icon">▤</div><div className="document-main"><strong>{doc.title}</strong><span>{doc.project}</span></div><span className={'status status-' + doc.status.toLowerCase().replace(' ', '-')}>{doc.status}</span><span className="document-updated">{doc.updated}</span><button className="row-menu" aria-label={'More options for ' + doc.title}>···</button></article>)}{!loading && filtered.length === 0 && <div className="empty-state"><strong>{apiError ? 'Workspace unavailable' : 'No documents yet'}</strong><p>{apiError ? 'Reconnect to the API to load your documents.' : 'Create your first document to get started.'}</p></div>}</div>
              <button className="secondary-button full-button" onClick={() => { setNotice(''); setShowCreate(true); }} disabled={!projects.length || loading}>＋ Create a document</button>
            </div>
            <aside className="activity-section"><div className="section-heading"><div><h2>Recent activity</h2><p>Latest changes from your projects.</p></div><button className="more-button" aria-label="Refresh activity" onClick={() => void loadWorkspace()}>↻</button></div><div className="activity-list">{activities.map((activity, index) => <div className="activity-item" key={index}><span className={'activity-avatar avatar-' + activity.color}>{activity.initials}</span><div className="activity-copy"><p><strong>{activity.title}</strong> {activity.action} <a href="#activity">{activity.target}</a></p><span>{activity.time}</span></div></div>)}{!loading && !activities.length && <div className="empty-state compact-empty"><p>New project and document activity will appear here.</p></div>}</div><a className="activity-link" href="#all-activity" onClick={(event) => event.preventDefault()}>Recent project events <span>→</span></a><div className="tip-card"><span className="tip-sparkle">✦</span><p className="tip-label">NEXT UP</p><h3>Build your writing workflow.</h3><p>Projects and documents now save through the API. Authentication, a rich-text editor, and real-time collaboration are still planned.</p><a href="https://github.com/akhilrajakraj/academic-collab-platform">View project on GitHub <span>↗</span></a></div></aside>
          </section>
          <footer className="page-footer"><span>Made for curious minds <span className="footer-heart">♥</span></span><span>Academic Collab · API-backed development preview</span></footer>
        </div>
      </section>
      {showCreate && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setShowCreate(false); }}><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><button className="modal-close" onClick={() => setShowCreate(false)} disabled={saving} aria-label="Close dialog">×</button><div className="modal-icon">▤</div><p className="eyebrow">SAVE TO YOUR PROJECT</p><h2 id="create-title">Create a document</h2><p className="modal-description">Your document will be saved in the first project in your workspace.</p><form onSubmit={(event) => { event.preventDefault(); void createDocument(); }}><label htmlFor="document-title">Document title</label><input id="document-title" autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="e.g. Project proposal" maxLength={160} required /><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</button><button type="submit" className="primary-button" disabled={saving || !newTitle.trim()}>{saving ? 'Saving…' : 'Create document'} <span>→</span></button></div></form><p className="demo-note">Signed-in account · This document is stored in PostgreSQL. Real-time collaboration is not yet enabled.</p></section></div>}
    </main>
  );
}
