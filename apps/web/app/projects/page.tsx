'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Project = { id: string; name: string; description?: string | null; createdAt?: string; _count?: { documents?: number; members?: number } };
type DocumentItem = { id: string; title: string; status?: string; updatedAt?: string };

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');

export default function ProjectsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setToken(sessionStorage.getItem('academic-collab-access-token')); }, []);

  const loadProjects = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const headers = { Authorization: 'Bearer ' + token };
      const response = await fetch(API_BASE + '/projects', { headers, cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load projects. Check your connection and try again.');
      const rows: Project[] = await response.json();
      setProjects(rows);
      const countPairs = await Promise.all(rows.map(async (project) => {
        const result = await fetch(API_BASE + '/projects/' + project.id + '/documents', { headers, cache: 'no-store' });
        if (!result.ok) return [project.id, 0] as const;
        const docs: DocumentItem[] = await result.json();
        return [project.id, docs.length] as const;
      }));
      setCounts(Object.fromEntries(countPairs));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load projects.');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (token) void loadProjects(); else setLoading(false); }, [token, loadProjects]);

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !name.trim() || saving) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(API_BASE + '/projects', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message || 'Project could not be created.');
      setProjects((current) => [result, ...current]);
      setCounts((current) => ({ ...current, [result.id]: 0 }));
      setName(''); setDescription(''); setShowCreate(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Project could not be created.'); }
    finally { setSaving(false); }
  }

  if (!token && loading) return <main className="auth-shell auth-loading-shell"><section className="auth-card auth-loading-card"><span className="brand-mark">a.</span><span className="loading-spinner" role="status" aria-label="Loading" /><h1>Preparing your projects</h1><p>Checking your session…</p></section></main>;
  if (!token) return <main className="auth-shell"><section className="auth-card"><Link className="brand auth-brand" href="/"><span className="brand-mark">a.</span><span>academic<span className="brand-light">collab</span></span></Link><p className="eyebrow">YOUR TEAM WORKSPACE</p><h1>Projects start here.</h1><p className="auth-description">Sign in to see your projects, organise documents, and collaborate with your team.</p><Link className="primary-button auth-submit" href="/workspace">Go to sign in <span>→</span></Link></section></main>;

  return <main className="app-shell">
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="Academic Collab home"><span className="brand-mark">a.</span><span>academic<span className="brand-light">collab</span></span></Link>
      <div className="workspace-switch"><span className="workspace-avatar">AC</span><span className="workspace-copy"><strong>Student workspace</strong><small>Project hub</small></span><span className="chevron">⌄</span></div>
      <p className="nav-label">WORKSPACE</p><nav className="navigation" aria-label="Main navigation">
        <Link className="nav-item" href="/workspace"><span className="nav-icon" data-tooltip="Workspace overview" aria-hidden="true">▦</span> Overview</Link>
        <Link className="nav-item active" href="/projects" aria-current="page"><span className="nav-icon" data-tooltip="Your projects" aria-hidden="true">◫</span> My projects <span className="nav-count">{projects.length}</span></Link>
        <Link className="nav-item" href="/documents"><span className="nav-icon" data-tooltip="Project documents" aria-hidden="true">▤</span> Documents</Link>
        <Link className="nav-item" href="/shared"><span className="nav-icon" data-tooltip="Projects and documents shared with you" aria-hidden="true">♧</span> Shared with me</Link>
      </nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-icon">✳</span><strong>Project tip</strong><p>Keep related documents together inside each project.</p><Link href="/documents">Browse documents <span>↗</span></Link></div><Link className="profile-button" href="/workspace"><span className="profile-avatar">AC</span><span className="profile-copy"><strong>Workspace</strong><small>Back to overview</small></span></Link></div>
    </aside>
    <section className="main-panel">
      <header className="topbar"><div className="breadcrumbs"><Link href="/workspace">Workspace</Link><span>/</span><strong>My projects</strong></div><div className="topbar-actions"><button className="icon-button" title="Refresh projects" aria-label="Refresh projects" onClick={() => void loadProjects()} disabled={loading}>↻</button></div></header>
      <div className="page-content projects-page-content">
        <div className="welcome-row projects-page-heading"><div><p className="eyebrow">YOUR COLLABORATION SPACE</p><h1>My projects</h1><p className="welcome-subtitle">Every team, idea, and document starts with a project.</p></div><button className="primary-button" onClick={() => setShowCreate((value) => !value)}>＋ New project</button></div>
        {error && <div className="api-banner" role="alert"><strong>Something needs attention</strong><p>{error}</p><button className="secondary-button" onClick={() => void loadProjects()}>Try again</button></div>}
        <label className="search-box projects-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your projects…" aria-label="Search projects" /></label>
        {showCreate && <form className="create-project-panel" onSubmit={createProject}><div><p className="eyebrow">NEW WORKSPACE</p><h2>Create a project</h2><p>Give your team a clear home for its work.</p></div><label>Project name<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. AI in Education" /></label><label>Description <span>(optional)</span><textarea rows={3} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What are you working on?" /></label><div className="create-project-actions"><button className="secondary-button" type="button" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</button><button className="primary-button" type="submit" disabled={saving || !name.trim()}>{saving ? 'Creating…' : 'Create project'}</button></div></form>}
        <section className="projects-grid" aria-label="Your projects">
          {loading ? <div className="workspace-loading"><span className="loading-spinner" /><div><strong>Loading your projects…</strong><p>Gathering your project spaces.</p></div></div> : projects.filter((project) => (project.name + ' ' + (project.description || '')).toLowerCase().includes(query.toLowerCase())).map((project, index) => <article className="project-card" key={project.id}><div className="project-card-top"><span className={'project-card-icon ' + ['project-tone-green','project-tone-violet','project-tone-amber'][index % 3]}>▦</span><span className="project-card-menu" title="Project workspace">•••</span></div><p className="eyebrow">PROJECT {String(index + 1).padStart(2, '0')}</p><h2>{project.name}</h2><p className="project-card-description">{project.description || 'A shared space for your team’s ideas, writing, and research.'}</p><div className="project-card-stats"><span><strong>{counts[project.id] ?? 0}</strong> documents</span><span><strong>{project._count?.members ?? '—'}</strong> members</span></div><div className="project-card-footer"><Link href={'/documents?project=' + encodeURIComponent(project.id)}>Open documents <span>↗</span></Link><Link href={'/workspace?project=' + encodeURIComponent(project.id)} aria-label={'Open ' + project.name}>Open project →</Link></div></article>)}
          {!loading && !projects.length && !error && <div className="empty-state projects-empty"><strong>No projects yet</strong><p>Create your first project to give your team a shared place to work.</p><button className="primary-button" onClick={() => setShowCreate(true)}>＋ Create your first project</button></div>}
          {!loading && projects.length > 0 && !projects.some((project) => (project.name + ' ' + (project.description || '')).toLowerCase().includes(query.toLowerCase())) && <div className="empty-state projects-empty"><strong>No matching projects</strong><p>Try another project name or description.</p></div>}
        </section>
      </div>
    </section>
  </main>;
}
