import Link from 'next/link';

const features = [
  { number: '01', icon: '↗', title: 'One home for every project', description: 'Keep research notes, working documents, and project context together instead of scattered across tabs and chat threads.' },
  { number: '02', icon: '⌘', title: 'Writing that moves forward', description: 'Create structured documents, refine ideas, and keep drafts moving through a clear review workflow.' },
  { number: '03', icon: '◎', title: 'A team that stays in sync', description: 'Invite collaborators, set project roles, and see activity so everyone knows what is happening next.' },
];

const steps = [
  { number: '01', title: 'Start with a project', description: 'Give your research, assignment, or group project a shared home.' },
  { number: '02', title: 'Bring your team in', description: 'Invite classmates and organise how everyone contributes.' },
  { number: '03', title: 'Turn ideas into a draft', description: 'Create documents, exchange feedback, and keep work organised.' },
];

function Brand() {
  return (
    <span className="brand-lockup">
      <span className="brand-symbol" aria-hidden="true"><span /></span>
      <span>academic<span className="brand-name-light">collab</span></span>
    </span>
  );
}

export default function HomePage() {
  return (
    <main className="landing-page" id="top">
      <header className="landing-header">
        <div className="landing-container nav-inner">
          <Link className="brand-link" href="/" aria-label="Academic Collab home"><Brand /></Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#about">Our approach</a>
          </nav>
          <div className="nav-actions">
            <Link className="nav-signin" href="/workspace">Sign in</Link>
            <Link className="button button-dark button-nav" href="/workspace">Open workspace <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </header>

      <section className="hero-section" id="about">
        <div className="landing-container hero-grid">
          <div className="hero-copy">
            <div className="announcement"><span className="announcement-dot" /> A calmer way to work together <span aria-hidden="true">↗</span></div>
            <h1>Good research<br />is <span className="serif-accent">never</span> done alone.</h1>
            <p className="hero-description">A shared workspace for student teams to organise projects, write together, and turn scattered ideas into work they’re proud to submit.</p>
            <div className="hero-actions">
              <Link className="button button-dark button-large" href="/workspace">Get started <span aria-hidden="true">↗</span></Link>
              <a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack" aria-hidden="true"><span>AK</span><span>MJ</span><span>SR</span><span>+</span></div>
              <div><strong>Built for the way students work</strong><small>Projects · Documents · Teamwork</small></div>
            </div>
          </div>

          <div className="hero-visual" aria-label="Illustration of an organised collaborative research workspace">
            <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
            <div className="workspace-window">
              <div className="window-top"><div className="window-dots"><i /><i /><i /></div><span>YOUR PROJECT SPACE</span><span className="window-menu">•••</span></div>
              <div className="window-body">
                <aside className="mini-sidebar">
                  <div className="mini-brand"><span className="mini-brand-icon">a.</span><span>workspace</span></div>
                  <div className="mini-nav active"><span>▦</span> Overview</div>
                  <div className="mini-nav"><span>▤</span> Documents</div>
                  <div className="mini-nav"><span>◉</span> Team</div>
                  <div className="mini-nav"><span>◷</span> Activity</div>
                  <div className="mini-sidebar-bottom"><span className="mini-avatar">AK</span><span><b>Alex Kim</b><small>Project owner</small></span></div>
                </aside>
                <div className="mini-content">
                  <div className="mini-breadcrumb">Projects <span>/</span> Research group</div>
                  <div className="mini-title-row"><div><small>YOUR TEAM WORKSPACE</small><h3>Research group</h3><p>Your ideas, in one place.</p></div><span className="mini-new">＋ New</span></div>
                  <div className="mini-stat-grid"><div><small>Documents</small><strong>08</strong><span>Across this project</span></div><div><small>Team members</small><strong>04</strong><span>Working together</span></div></div>
                  <div className="mini-doc-heading"><b>Recent documents</b><span>View all ↗</span></div>
                  <div className="mini-doc"><span className="doc-icon doc-purple">▤</span><span className="doc-meta"><b>Research proposal</b><small>Updated just now</small></span><span className="doc-status status-review">In review</span></div>
                  <div className="mini-doc"><span className="doc-icon doc-green">▤</span><span className="doc-meta"><b>Literature review</b><small>Updated 2 hours ago</small></span><span className="doc-status status-draft">Draft</span></div>
                  <div className="mini-doc"><span className="doc-icon doc-orange">▤</span><span className="doc-meta"><b>Project outline</b><small>Updated yesterday</small></span><span className="doc-status status-done">Approved</span></div>
                </div>
              </div>
            </div>
            <div className="floating-note note-team"><span className="note-check">✓</span><span><b>Everyone on the same page</b><small>Project context stays together</small></span></div>
            <div className="floating-note note-draft"><span className="note-pencil">✎</span><span><b>Research proposal</b><small>Ready for review</small></span><span className="note-arrow">↗</span></div>
            <div className="visual-caption"><span /> A clearer place to make progress.</div>
          </div>
        </div>
        <div className="landing-container hero-bottom"><span>MADE FOR STUDENT PROJECTS</span><div><span>Research</span><i /> <span>Writing</span><i /> <span>Collaboration</span><i /> <span>Review</span></div></div>
      </section>

      <section className="intro-strip">
        <div className="landing-container intro-inner"><p>LESS TOOL-HOPPING.<br /><span>MORE THINKING TOGETHER.</span></p><div className="intro-divider" /><p className="intro-copy">The best work happens when people can focus on the ideas—not on finding the latest file, chasing updates, or figuring out what comes next.</p></div>
      </section>

      <section className="features-section section-space" id="features">
        <div className="landing-container">
          <div className="section-heading"><div><span className="section-kicker">A BETTER WAY TO COLLABORATE</span><h2>Everything in its place.<br /><span className="serif-accent">Everyone in the loop.</span></h2></div><p>From the first brainstorm to the final draft, give your team a shared place to think, create, and make progress.</p></div>
          <div className="feature-grid">{features.map((feature) => <article className="feature-card" key={feature.number}><div className="feature-card-top"><span className="feature-number">{feature.number} / 03</span><span className="feature-icon" aria-hidden="true">{feature.icon}</span></div><h3>{feature.title}</h3><p>{feature.description}</p><a href="#how-it-works" aria-label={feature.title}>Explore the workflow <span aria-hidden="true">↗</span></a></article>)}</div>
        </div>
      </section>

      <section className="workflow-section section-space" id="how-it-works">
        <div className="landing-container workflow-grid">
          <div className="workflow-copy"><span className="section-kicker">A SIMPLE PLACE TO BEGIN</span><h2>From “where do we start?” to <span className="serif-accent">“we’ve got this.”</span></h2><p>No complicated process to learn. Just a shared space that helps your team stay organised and move one step at a time.</p><Link className="button button-light button-large" href="/workspace">Enter your workspace <span aria-hidden="true">↗</span></Link></div>
          <div className="workflow-steps">{steps.map((step) => <article className="workflow-step" key={step.number}><span className="step-number">{step.number}</span><div><h3>{step.title}</h3><p>{step.description}</p></div><span className="step-arrow" aria-hidden="true">↗</span></article>)}</div>
        </div>
      </section>

      <section className="closing-section"><div className="landing-container closing-inner"><span className="closing-mark" aria-hidden="true">✳</span><span className="section-kicker">YOUR NEXT IDEA STARTS HERE</span><h2>Make space for<br /><span className="serif-accent">better work.</span></h2><p>Bring your project and your people together.</p><Link className="button button-dark button-large" href="/workspace">Get started with Academic Collab <span aria-hidden="true">↗</span></Link></div></section>

      <footer className="landing-footer"><div className="landing-container footer-main"><Link className="brand-link" href="/"><Brand /></Link><p>A shared space for ideas<br />that grow together.</p><div className="footer-links"><a href="#features">Features</a><a href="#how-it-works">How it works</a><Link href="/workspace">Workspace sign in</Link></div><a className="back-top" href="#top">Back to top ↑</a></div><div className="landing-container footer-bottom"><span>© {new Date().getFullYear()} Academic Collab</span><span>Built for thoughtful collaboration.</span></div></footer>
    </main>
  );
}
