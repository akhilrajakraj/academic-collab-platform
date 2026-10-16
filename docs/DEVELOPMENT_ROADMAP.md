# Academic Collab Writer — Development Roadmap

This roadmap divides implementation into independently reviewable modules. The current codebase is a working foundation, not yet a complete collaborative writing product. Features are marked **Existing**, **In progress**, or **Planned** based on source inspection; they are not claims that the application has been executed or tested in this environment.

## Product outcome

A student can create a project, invite collaborators, co-author a structured document, review it with contextual comments, inspect and restore revisions, and export a polished final document.

## Module map

| Module | Scope | Current status | Completion signal |
|---|---|---|---|
| M0 — Platform foundation | pnpm workspace, Next.js web app, NestJS API, Prisma/PostgreSQL, local Docker services, CI | Existing foundation; verification required | Clean install, migrations, build, lint/typecheck, health checks pass |
| M1 — Identity and access control | Registration/login, token validation, project membership, role policy, validation, security baseline | Existing basics; hardening in progress | Cross-account and role-based API tests prove no unauthorized reads/writes |
| M2 — Project and membership collaboration | Project lifecycle, invitations, accept/reject/expire/revoke, role management, member UI | Project CRUD exists; invitations planned | Owner invites a collaborator and can safely change/revoke membership |
| M3 — Document editing and persistence | Rich-text editor, structured content, autosave, save state, stale-write protection | API persistence/revisions exist; stale-write protection in progress; editor planned | Edits survive refresh and concurrent stale saves return a conflict instead of overwriting |
| M4 — Review and revision workflow | Comments, anchored comments, resolve/reopen, document status transitions, revision history/restore | Basic comment and revision APIs exist; full UI/workflow planned | Reviewers can comment; permitted editors manage status; old versions can be restored safely |
| M5 — Real-time collaboration | Yjs document model, WebSocket provider, presence, reconnect/recovery, server-side authorization | Planned | Two clients can edit concurrently and converge after reconnect |
| M6 — Export and file handling | PDF/DOCX export, templates, background jobs, object storage, export history | Planned; MinIO is configured for local development | Exported file opens correctly and preserves document structure |
| M7 — Academic assistance | Opt-in outline suggestions, writing feedback, citation assistance, source-aware suggestions | Planned | AI output is reviewable, source-aware where applicable, and never silently replaces user text |
| M8 — Release readiness | Accessibility, observability, backups, rate limits, security headers, deployment/runbooks | Partial foundation; verification required | Reproducible release, documented recovery, security and accessibility checks pass |

## Current implementation focus: M1 + M3 API correctness

### Delivered on this development branch

- M1 input validation now rejects whitespace-only display names, project names, document titles and comment bodies.
- Document status updates now follow an explicit transition matrix. Only the project owner can archive or reopen archived documents; invalid transitions return HTTP 400.
- Added optional `expectedUpdatedAt` to the document update DTO. Clients can send the ISO-8601 `updatedAt` value returned by the document API.
- Document updates compare the supplied version against the loaded record and use a conditional database write. If the document changes before the write, the API responds with HTTP 409 and a stable `DOCUMENT_VERSION_CONFLICT` code instead of silently overwriting newer content.
- The update and revision creation happen in a transaction, so a failed conditional write rolls back the attempted revision as well.
- For backward compatibility, the version precondition remains optional for existing clients. New editor clients should always send it; making it mandatory is a later API-versioning decision.

### Required verification before merging

1. Confirm whitespace-only display names, project names, document titles and comment bodies return HTTP 400.
2. Confirm editors cannot archive or reopen documents and invalid status transitions return HTTP 400.
3. Install from the committed lockfile and generate the Prisma client.
2. Run API typecheck, lint, and build.
3. Exercise a normal document update and confirm the response includes the latest `updatedAt`.
4. Submit an update with a stale `expectedUpdatedAt`; confirm HTTP 409 and verify that neither document content nor revision history was changed by the failed transaction.
5. Submit a valid update with the latest version; confirm it succeeds and creates a revision only for a title/content edit.

## Module delivery sequence

### M1.1 — API correctness and access baseline
- Validate DTO boundaries and consistent API errors.
- Define a role/operation matrix and test every protected route.
- Verify JWT secret configuration and authentication throttling.
- Add conflict-safe writes and tests for unauthorized access and stale updates.

### M2.1 — Membership invitations
- Add invitation records with unique, expiring tokens stored as hashes.
- Add create, accept, decline, revoke and resend flows.
- Restrict invitation creation and role changes to project owners.
- Add a member list and invitation states to the project UI.
- Test expired, reused, revoked and cross-project invitation tokens.

### M3.1 — Writing experience
- Add a Tiptap editor using the document JSON format already stored by the API.
- Add debounced autosave with explicit Saving / Saved / Failed states.
- Send `expectedUpdatedAt` on every save; handle 409 by offering reload/compare rather than overwriting.
- Add title editing, keyboard accessibility and unsaved-change handling.

### M4.1 — Review and history
- Display comments beside the document and support anchored selections.
- Add resolve/reopen controls and permission-aware UI.
- Add revision history with author/date and a restore confirmation.
- Define allowed status transitions and enforce them on the server.

### M5.1 — Live collaboration
- Introduce Yjs only after single-user editing and conflict behavior are reliable.
- Define a persistence format and migration strategy before changing the source of truth.
- Authorize WebSocket rooms with project membership and revalidate access.
- Test concurrent edits, disconnects, reconnects and document access revocation.

### M6–M8 — Export, academic assistance and production readiness
- Add PDF/DOCX export through a tested conversion pipeline.
- Keep AI assistance opt-in, explainable and user-approved.
- Complete accessibility, monitoring, backups, deployment, and incident/recovery documentation.

## End-to-end acceptance scenario

1. Student A registers and creates a project.
2. A invites Student B; B accepts and appears in the member list.
3. B opens the document and edits it; autosave confirms success.
4. A opens an older copy and attempts to save stale content; the API returns a conflict and preserves B's newer work.
5. B leaves a contextual comment; an authorized collaborator resolves it.
6. A restores a previous revision, with the current content preserved as a new revision.
7. An unrelated account cannot access the project, documents, comments, revisions or invitation data.

## Development discipline

- Deliver one coherent module or milestone per branch/PR.
- Do not claim a feature is complete until the relevant checks and acceptance scenario pass.
- Keep secrets out of source control; local Docker credentials are development-only.
- Prefer additive schema migrations and explicit API contracts.
- Do not start real-time collaboration or AI automation before access control, autosave and revision recovery are dependable.
