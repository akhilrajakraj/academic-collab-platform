'use client';

import { useMemo, useState } from 'react';

type DocumentItem = { id: number; title: string; project: string; status: 'Draft' | 'In review' | 'Approved'; updated: string };

const initialDocuments: DocumentItem[] = [
  { id: 1, title: 'Research proposal', project: 'AI in Education', status: 'In review', updated: '12 min ago' },
  { id: 2, title: 'Literature review', project: 'AI in Education', status: 'Draft', updated: 'Yesterday' },
  { id: 3, title: 'System requirements specification', project: 'Campus Connect', status: 'Approved', updated: '2 days ago' },
];

const activities = [
  { initials: 'AM', color: 'violet', title: 'Ananya Menon', action: 'left feedback on', target: 'Research proposal', time: '12 min ago' },
  { initials: 'RJ', color: 'blue', title: 'Rahul Joseph', action: 'updated', target: 'Literature review', time: '1 hour ago' },
  { initials: 'You', color: 'green', title: 'You', action: 'created project', target: 'Campus Connect', time: 'Yesterday' },
];

export default function HomePage() {
  const [documents, setDocuments] = useState(initialDocuments);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All documents');
  const filtered = useMemo(() => documents.filter((doc) =>
    (doc.title.toLowerCase().includes(query.toLowerCase()) || doc.project.toLowerCase().includes(query.toLowerCase())) &&
    (selectedFilter === 'All documents' || doc.status === selectedFilter)
  ), [documents, query, selectedFilter]);

  function createDocument() {
    const title = newTitle.trim();
    if (!title) return;
    setDocuments((current) => [{ id: Date.now(), title, project: 'AI in Education', status: 'Draft', updated: 'Just now' }, ...current]);
    setNewTitle('');
    setShowCreate(false);
    setSelectedFilter('All documents');
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Academic Collab home"><span className="brand-mark">a.</span><span>academic<span className="brand-light">collab</span></span></a>
        <div className="workspace-switch"><span className="workspace-avatar">AC</span><span className="workspace-copy"><strong>Student workspace</strong><small>Free plan</small></span><span className="chevron">⌄</span></div>
        <p className="nav-label">WORKSPACE</p>
        <nav className="navigation" aria-label="Main navigation">
          <a className="nav-item active" href="#overview"><span>▦</span> Overview</a>
          <a className="nav-item" href="#projects"><span>◫</span> My projects <span className="nav-count">3</span></a>
          <a className="nav-item" href="#documents"><span>▤</span> Documents</a>
          <a className="nav-item" href="#shared"><span>♧</span> Shared with me</a>
        </nav>
        <p className="nav-label second-label">YOUR PROJECTS <button className="tiny-add" onClick={() => setShowCreate(true)} aria-label="Create a document">+</button></p>
        <nav className="navigation project-navigation" aria-label="Your projects">
          <a className="nav-item project-link" href="#ai"><span className="project-dot dot-purple" /> AI in Education</a>
          <a className="nav-item project-link" href="#campus"><span className="project-dot dot-blue" /> Campus Connect</a>
          <a className="nav-item project-link" href="#research"><span className="project-dot dot-orange" /> Research Methods</a>
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><span className="help-icon">✳</span><strong>Need a hand?</strong><p>Explore guides to make your next project better.</p><a href="#guides">Browse learning guides <span>↗</span></a></div><button className="profile-button"><span className="profile-avatar">AR</span><span className="profile-copy"><strong>Student account</strong><small>Personal workspace</small></span><span className="chevron">···</span></button></div>
      </aside>

      <section className="main-panel" id="overview">
        <header className="topbar"><div className="breadcrumbs">Workspace <span>/</span> <strong>Overview</strong></div><div className="topbar-actions"><button className="icon-button" aria-label="Help">?</button><button className="notification-button" aria-label="Notifications">♧<i /></button><span className="top-avatar">AR</span></div></header>
        <div className="page-content">
          <section className="welcome-row"><div><p className="eyebrow">MONDAY, OCTOBER 13, 2026</p><h1>Your ideas, <span>taking shape.</span></h1><p className="welcome-subtitle">Pick up where you left off or start something new with your team.</p></div><button className="primary-button" onClick={() => setShowCreate(true)}><span>＋</span> New document</button></section>
          <section className="stats-grid" aria-label="Workspace summary">
            <article className="stat-card"><div className="stat-top"><span>Active projects</span><span className="stat-icon purple-icon">◫</span></div><div className="stat-value">3</div><div className="stat-foot"><span className="trend">↗ 1 new</span><span> this month</span></div></article>
            <article className="stat-card"><div className="stat-top"><span>Total documents</span><span className="stat-icon blue-icon">▤</span></div><div className="stat-value">{documents.length + 9}</div><div className="stat-foot">Across all your projects</div></article>
            <article className="stat-card"><div className="stat-top"><span>Awaiting review</span><span className="stat-icon amber-icon">◷</span></div><div className="stat-value">{documents.filter(d => d.status === 'In review').length}</div><div className="stat-foot">Keep your team moving</div></article>
            <article className="stat-card"><div className="stat-top"><span>Collaborators</span><span className="stat-icon green-icon">♧</span></div><div className="stat-value">6</div><div className="stat-foot">Across 3 projects</div></article>
          </section>
          <section className="content-grid">
            <div className="documents-section" id="documents">
              <div className="section-heading"><div><h2>Recent documents</h2><p>Your team’s work, all in one place.</p></div><a href="#all-documents">View all <span>→</span></a></div>
              <div className="document-toolbar"><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents..." aria-label="Search documents" /></label><label className="filter-select"><span className="sr-only">Filter documents</span><select value={selectedFilter} onChange={(event) => setSelectedFilter(event.target.value)}><option>All documents</option><option>Draft</option><option>In review</option><option>Approved</option></select></label></div>
              <div className="document-list">{filtered.map((doc) => <article className="document-row" key={doc.id}><div className="document-icon">▤</div><div className="document-main"><strong>{doc.title}</strong><span>{doc.project}</span></div><span className={'status status-' + doc.status.toLowerCase().replace(' ', '-')}>{doc.status}</span><span className="document-updated">{doc.updated}</span><button className="row-menu" aria-label={'More options for ' + doc.title}>···</button></article>)}{filtered.length === 0 && <div className="empty-state"><strong>No documents found</strong><p>Try another search or create a new document.</p></div>}</div>
              <button className="secondary-button full-button" onClick={() => setShowCreate(true)}>＋ Create a document</button>
            </div>
            <aside className="activity-section"><div className="section-heading"><div><h2>Recent activity</h2><p>The latest from your team.</p></div><button className="more-button" aria-label="Activity options">···</button></div><div className="activity-list">{activities.map((activity, index) => <div className="activity-item" key={index}><span className={'activity-avatar avatar-' + activity.color}>{activity.initials}</span><div className="activity-copy"><p><strong>{activity.title}</strong> {activity.action} <a href="#activity">{activity.target}</a></p><span>{activity.time}</span></div></div>)}</div><a className="activity-link" href="#all-activity">View all activity <span>→</span></a><div className="tip-card"><span className="tip-sparkle">✦</span><p className="tip-label">A LITTLE TIP</p><h3>Great work starts with a plan.</h3><p>Outline your ideas before writing. Your future self will thank you.</p><a href="#guides">Explore writing guides <span>↗</span></a></div></aside>
          </section>
          <footer className="page-footer"><span>Made for curious minds <span className="footer-heart">♥</span></span><span>Academic Collab · Preview build</span></footer>
        </div>
      </section>
      {showCreate && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><button className="modal-close" onClick={() => setShowCreate(false)} aria-label="Close dialog">×</button><div className="modal-icon">▤</div><p className="eyebrow">START WITH A BLANK PAGE</p><h2 id="create-title">Create a document</h2><p className="modal-description">Give your next idea a name. You can organize and invite collaborators later.</p><form onSubmit={(event) => { event.preventDefault(); createDocument(); }}><label htmlFor="document-title">Document title</label><input id="document-title" autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="e.g. Project proposal" maxLength={120} required /><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="primary-button">Create document <span>→</span></button></div></form><p className="demo-note">Preview only · Documents created here are stored in this page’s local state, not in the database yet.</p></section></div>}
    </main>
  );
}
