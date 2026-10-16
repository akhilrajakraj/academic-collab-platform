'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Project = { id: string; name: string; description?: string | null };
type ApiDocument = { id: string; projectId: string; title: string; status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'ARCHIVED'; updatedAt: string; project?: { name: string } };
type SharedDocument = { id: string; title: string; status: ApiDocument['status']; updatedAt: string; project: { id: string; name: string }; createdBy?: { displayName?: string; email?: string } };
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');
const label = (status: ApiDocument['status']): 'Draft' | 'In review' | 'Approved' | 'Archived' => { const labels: Record<ApiDocument['status'], 'Draft' | 'In review' | 'Approved' | 'Archived'> = { DRAFT: 'Draft', IN_REVIEW: 'In review', APPROVED: 'Approved', ARCHIVED: 'Archived' }; return labels[status]; };

export default function SharedPage() {
  const [token, setToken] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => { setToken(sessionStorage.getItem('academic-collab-access-token')); }, []);

  const loadShared = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const headers = { Authorization: 'Bearer ' + token };
      const response = await fetch(API_BASE + '/projects', { headers, cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load your shared workspace. Please try again.');
      const rows: Project[] = await response.json();
      setProjects(rows);
      const groups = await Promise.all(rows.map(async (project) => {
        const result = await fetch(API_BASE + '/projects/' + project.id + '/documents', { headers, cache: 'no-store' });
        if (!result.ok) throw new Error('Could not load documents from ' + project.name + '.');
        const docs: ApiDocument[] = await result.json();
        return docs.map((doc) => ({ ...doc, project: { id: project.id, name: project.name } }));
      }));
      setSharedDocuments(groups.flat());
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load shared items.'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { if (token) void loadShared(); else setLoading(false); }, [token, loadShared]);

  if (!token && loading) return <main className="auth-shell auth-loading-shell"><section className="auth-card auth-loading-card"><span className="brand-mark">a.</span><span className="loading-spinner" role="status" aria-label="Loading" /><h1>Preparing shared items</h1><p>Checking your session…</p></section></main>;
  if (!token) return <main className="auth-shell"><section className="auth-card"><Link className="brand auth-brand" href="/"><span className="brand-mark">a.</span><span>academic<span className="brand-light">collab</span></span></Link><p className="eyebrow">WORK BETTER TOGETHER</p><h1>Your shared workspace.</h1><p className="auth-description">Sign in to access projects and documents available to your account.</p><Link className="primary-button auth-submit" href="/workspace">Go to sign in <span>→</span></Link></section></main>;

  const filtered = sharedDocuments.filter((doc) => (doc.title + ' ' + doc.project.name).toLowerCase().includes(query.toLowerCase()));
  return <main className="app-shell">
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="Academic Collab home"><span className="brand-mark">a.</span><span>academic<span className="brand-light">collab</span></span></Link>
      <div className="workspace-switch"><span className="workspace-avatar">AC</span><span className="workspace-copy"><strong>Student workspace</strong><small>Project hub</small></span><span className="chevron">⌄</span></div>
      <p className="nav-label">WORKSPACE</p><nav className="navigation" aria-label="Main navigation">
        <Link className="nav-item" href="/workspace"><span className="nav-icon" data-tooltip="Workspace overview" aria-hidden="true">▦</span> Overview</Link>
        <Link className="nav-item" href="/projects"><span className="nav-icon" data-tooltip="Your projects" aria-hidden="true">◫</span> My projects <span className="nav-count">{projects.length}</span></Link>
        <Link className="nav-item" href="/documents"><span className="nav-icon" data-tooltip="Project documents" aria-hidden="true">▤</span> Documents</Link>
        <Link className="nav-item active" href="/shared" aria-current="page"><span className="nav-icon" data-tooltip="Shared workspace items" aria-hidden="true">♧</span> Shared with me <span className="nav-count">{sharedDocuments.length}</span></Link>
      </nav>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-icon">✳</span><strong>Collaboration tip</strong><p>Shared documents remain organised inside their project.</p><Link href="/documents">Browse all documents <span>↗</span></Link></div><Link className="profile-button" href="/workspace"><span className="profile-avatar">AC</span><span className="profile-copy"><strong>Workspace</strong><small>Back to overview</small></span></Link></div>
    </aside>
    <section className="main-panel">
      <header className="topbar"><div className="breadcrumbs"><Link href="/workspace">Workspace</Link><span>/</span><strong>Shared with me</strong></div><div className="topbar-actions"><button className="icon-button" title="Refresh shared items" aria-label="Refresh shared items" onClick={() => void loadShared()} disabled={loading}>↻</button></div></header>
      <div className="page-content shared-page-content">
        <div className="welcome-row shared-page-heading"><div><p className="eyebrow">COLLABORATION IN ONE PLACE</p><h1>Shared with me</h1><p className="welcome-subtitle">Projects and documents you can access with your team.</p></div><div className="document-page-count"><strong>{filtered.length.toString().padStart(2, '0')}</strong><span>Shared documents</span></div></div>
        <label className="search-box shared-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shared documents or projects…" aria-label="Search shared items" /></label>
        {error && <div className="api-banner" role="alert"><strong>Couldn’t load shared items</strong><p>{error}</p><button className="secondary-button" onClick={() => void loadShared()}>Try again</button></div>}
        <section className="documents-section shared-panel"><div className="section-heading"><div><h2>Available to you</h2><p>Open a document to continue working with your team.</p></div></div>
          {loading ? <div className="workspace-loading"><span className="loading-spinner" /><div><strong>Loading shared items…</strong><p>Checking your available projects and documents.</p></div></div> :
          <div className="shared-list">{filtered.map((doc) => <article className="shared-row" key={doc.id}><span className="shared-doc-icon">▤</span><div className="shared-doc-main"><Link href={'/documents/' + doc.id} className="document-title-link">{doc.title}</Link><span>{doc.project.name}</span></div><span className={'status status-' + label(doc.status).toLowerCase().replace(' ', '-')}>{label(doc.status)}</span><span className="document-updated">{doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently updated'}</span><Link className="document-open-link" href={'/documents/' + doc.id}>Open →</Link></article>)}
          {!filtered.length && !error && <div className="empty-state"><strong>{sharedDocuments.length ? 'No matching items' : 'Nothing shared yet'}</strong><p>{sharedDocuments.length ? 'Try another search.' : 'When you join a project or receive access to documents, they will appear here.'}</p><Link href="/projects" className="secondary-button">Explore my projects</Link></div>}</div>}
        </section>
        <section className="shared-projects-section"><div className="section-heading"><div><h2>Your project spaces</h2><p>Quick access to the projects available to your account.</p></div><Link href="/projects">View projects →</Link></div><div className="shared-project-grid">{projects.slice(0, 4).map((project, index) => <Link className="shared-project-card" href={'/documents?project=' + encodeURIComponent(project.id)} key={project.id}><span className={'project-card-icon ' + ['project-tone-green','project-tone-violet','project-tone-amber'][index % 3]}>▦</span><strong>{project.name}</strong><span>{project.description || 'Shared team workspace'}</span><b>Open documents ↗</b></Link>)}</div></section>
      </div>
    </section>
  </main>;
}
