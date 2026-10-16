'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Project = { id: string; name: string };
type ApiDocument = { id: string; projectId: string; title: string; status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'ARCHIVED'; updatedAt: string };
type DocumentRow = { id: string; projectId: string; project: string; title: string; status: 'Draft' | 'In review' | 'Approved' | 'Archived'; updatedAt: string };

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');
const statusLabel = (status: ApiDocument['status']): DocumentRow['status'] => {
  const labels: Record<ApiDocument['status'], DocumentRow['status']> = {
    DRAFT: 'Draft',
    IN_REVIEW: 'In review',
    APPROVED: 'Approved',
    ARCHIVED: 'Archived',
  };
  return labels[status];
};

function formatUpdated(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently updated';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return minutes + 'm ago';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h ago';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function DocumentsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [account, setAccount] = useState<{ displayName: string; email: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All documents');
  const [projectFilter, setProjectFilter] = useState('All projects');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setToken(sessionStorage.getItem('academic-collab-access-token'));
    const displayName = sessionStorage.getItem('academic-collab-display-name');
    const email = sessionStorage.getItem('academic-collab-email');
    if (displayName || email) setAccount({ displayName: displayName || 'My account', email: email || '' });
  }, []);

  const loadDocuments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: 'Bearer ' + token };
      const response = await fetch(API_BASE + '/projects', { headers, cache: 'no-store' });
      if (response.status === 401) {
        sessionStorage.removeItem('academic-collab-access-token');
        setToken(null);
        return;
      }
      if (!response.ok) throw new Error('Could not load your projects. Check that the API is running and try again.');
      const projectRows: Project[] = await response.json();
      setProjects(projectRows);
      const groups = await Promise.all(projectRows.map(async (project) => {
        const docsResponse = await fetch(API_BASE + '/projects/' + project.id + '/documents', { headers, cache: 'no-store' });
        if (!docsResponse.ok) throw new Error('Could not load documents for ' + project.name + '.');
        const rows: ApiDocument[] = await docsResponse.json();
        return rows.map((doc) => ({
          id: doc.id, projectId: doc.projectId, project: project.name,
          title: doc.title, status: statusLabel(doc.status), updatedAt: doc.updatedAt,
        }));
      }));
      setDocuments(groups.flat().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'An unexpected error occurred while loading documents.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) void loadDocuments(); else if (token === null) setLoading(false); }, [token, loadDocuments]);

  const filtered = useMemo(() => documents.filter((doc) =>
    (doc.title.toLowerCase().includes(query.toLowerCase()) || doc.project.toLowerCase().includes(query.toLowerCase())) &&
    (filter === 'All documents' || doc.status === filter) &&
    (projectFilter === 'All projects' || doc.projectId === projectFilter)
  ), [documents, query, filter, projectFilter]);

  const signOut = () => {
    sessionStorage.removeItem('academic-collab-access-token');
    sessionStorage.removeItem('academic-collab-display-name');
    sessionStorage.removeItem('academic-collab-email');
    window.location.assign('/workspace');
  };

  if (token === null && loading) return <main className="auth-shell auth-loading-shell" aria-busy="true"><section className="auth-card auth-loading-card"><span className="brand-mark">a.</span><span className="loading-spinner" role="status" aria-label="Loading" /><h1>Preparing your documents</h1><p>Checking your session and loading your workspace…</p></section></main>;
  if (!token) return <main className="auth-shell"><section className="auth-card"><Link className="brand auth-brand" href="/"><span className="brand-mark">a.</span><span>academic<span className="brand-light">collab</span></span></Link><p className="eyebrow">YOUR WORK, IN ONE PLACE</p><h1>Sign in to view documents.</h1><p className="auth-description">Your project documents are available after you sign in to Academic Collab.</p><Link className="primary-button auth-submit" href="/workspace">Go to sign in <span>→</span></Link></section></main>;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Academic Collab home"><span className="brand-mark">a.</span><span>academic<span className="brand-light">collab</span></span></Link>
        <div className="workspace-switch"><span className="workspace-avatar">AC</span><span className="workspace-copy"><strong>Student workspace</strong><small>Project hub</small></span><span className="chevron">⌄</span></div>
        <p className="nav-label">WORKSPACE</p>
        <nav className="navigation" aria-label="Main navigation">
          <Link className="nav-item" href="/workspace"><span className="nav-icon" data-tooltip="Workspace overview" aria-hidden="true">▦</span> Overview</Link>
          <Link className="nav-item" href="/projects"><span className="nav-icon" data-tooltip="Your projects" aria-hidden="true">◫</span> My projects <span className="nav-count">{projects.length}</span></Link>
          <Link className="nav-item active" href="/documents" aria-current="page"><span className="nav-icon" data-tooltip="Search and manage your documents" aria-hidden="true">▤</span> Documents <span className="nav-count">{documents.length}</span></Link>
          <Link className="nav-item" href="/shared"><span className="nav-icon" data-tooltip="Documents and projects shared with you" aria-hidden="true">♧</span> Shared with me</Link>
        </nav>
        <p className="nav-label second-label">YOUR PROJECTS</p>
        <nav className="navigation project-navigation" aria-label="Your projects">{projects.map((project, index) => <Link className="nav-item project-link" href={'/projects?project=' + encodeURIComponent(project.id)} key={project.id}><span className={'project-dot ' + ['dot-purple', 'dot-blue', 'dot-orange'][index % 3]} />{project.name}</Link>)}{!projects.length && !loading && <span className="nav-item project-link">No projects yet</span>}</nav>
        <div className="sidebar-bottom"><div className="help-card"><span className="help-icon">✳</span><strong>Need a hand?</strong><p>Find your work quickly with search and filters.</p><a href="#document-list">Browse documents <span>↗</span></a></div><div className="profile-button"><span className="profile-avatar">{(account?.displayName || 'My Account').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><span className="profile-copy"><strong>{account?.displayName || 'My account'}</strong><small>{account?.email || 'Signed-in account'}</small></span><button className="signout-small" onClick={signOut}>Sign out</button></div></div>
      </aside>

      <section className="main-panel">
        <header className="topbar"><div className="breadcrumbs"><Link href="/workspace">Overview</Link><span>/</span><strong>Documents</strong></div><div className="topbar-actions"><button className="icon-button" title="Refresh document list" aria-label="Refresh document list" onClick={() => void loadDocuments()}>↻</button><button className="top-avatar signout-avatar" onClick={signOut} aria-label="Sign out" title="Sign out">↗</button></div></header>
        <div className="page-content documents-page-content">
          <div className="welcome-row documents-page-heading"><div><p className="eyebrow">YOUR ACADEMIC WORKSPACE</p><h1>Documents</h1><p className="welcome-subtitle">Find drafts, pick up where you left off, and keep every project organised.</p></div><div className="document-page-count"><strong>{documents.length.toString().padStart(2, '0')}</strong><span>Total documents</span></div></div>
          {error && <div className="api-banner" role="alert"><strong>Couldn’t load documents</strong><p>{error}</p><button className="secondary-button" onClick={() => void loadDocuments()}>Try again</button></div>}
          <section className="documents-section documents-page-panel" id="document-list">
            <div className="section-heading documents-panel-heading"><div><h2>All documents</h2><p>Search across your projects and filter by status.</p></div><button className="documents-refresh-button" onClick={() => void loadDocuments()} disabled={loading} aria-label={loading ? 'Refreshing documents' : 'Refresh documents'} title={loading ? 'Refreshing documents…' : 'Refresh documents'}><span className={loading ? 'documents-refresh-icon is-spinning' : 'documents-refresh-icon'} aria-hidden="true">↻</span></button></div>
            <div className="document-toolbar documents-page-toolbar"><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by document or project…" aria-label="Search documents" /></label><label className="filter-select"><span className="sr-only">Filter by status</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All documents</option><option>Draft</option><option>In review</option><option>Approved</option><option>Archived</option></select></label><label className="filter-select project-filter"><span className="sr-only">Filter by project</span><select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}><option value="All projects">All projects</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label></div>
            <div className="documents-table-head"><span>DOCUMENT</span><span>PROJECT</span><span>STATUS</span><span>LAST UPDATED</span><span /></div>
            <div className="document-list documents-page-list">
              {loading ? <div className="workspace-loading" role="status" aria-live="polite"><span className="loading-spinner" aria-hidden="true" /><div><strong>Loading your documents…</strong><p>Fetching the latest documents from your projects.</p></div></div> :
                filtered.map((doc) => <article className="document-row documents-page-row" key={doc.id}><div className="document-icon" aria-hidden="true">▤</div><div className="document-main"><Link className="document-title-link" href={'/documents/' + doc.id}>{doc.title}</Link><span className="document-row-project-mobile">{doc.project}</span></div><span className="document-row-project">{doc.project}</span><span className={'status status-' + doc.status.toLowerCase().replace(' ', '-')}>{doc.status}</span><span className="document-updated">{formatUpdated(doc.updatedAt)}</span><Link className="document-open-link" href={'/documents/' + doc.id} aria-label={'Open ' + doc.title} title={'Open ' + doc.title}>Open →</Link></article>)
              }
              {!loading && !error && filtered.length === 0 && <div className="empty-state"><strong>{documents.length ? 'No matching documents' : 'No documents yet'}</strong><p>{documents.length ? 'Try changing your search or filters.' : 'Documents you create in a project will appear here.'}</p></div>}
            </div>
            <div className="documents-page-footer"><span>Showing {filtered.length} of {documents.length} documents</span><span>Changes are saved to your project workspace.</span></div>
          </section>
        </div>
      </section>
    </main>
  );
}
