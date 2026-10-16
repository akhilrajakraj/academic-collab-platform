# Academic Collab Writer — Development Roadmap

This roadmap divides implementation into independently reviewable modules. The current codebase is a working foundation, not yet a complete collaborative writing product. Features are marked **Existing**, **In progress**, or **Planned** based on source inspection; they are not claims that the application has been executed or tested in this environment.

## Product outcome

A student can create a project, invite collaborators, co-author a structured document, review it with contextual comments, inspect and restore revisions, and export a polished final document.

## Module map

| Module | Scope | Current status | Completion signal |
|---|---|---|---|
| M0 — Platform foundation | pnpm workspace, Next.js web app, NestJS API, Prisma/PostgreSQL, local Docker services, CI | Existing foundation; verification required | Clean install, migrations, build, lint/typecheck, health checks pass |
| M1 — Identity and access control | Registration/login, token validation, project membership, role policy, validation, security baseline | Existing basics; hardening in progress | Cross-account and role-based API tests prove no unauthorized reads/writes |
| M2 — Project and membership collaboration | Project lifecycle, invitations, accept/decline/expire/revoke, role management, member UI | Invitation API, schema migration and team UI implemented on this branch; runtime verification pending | Owner invites a collaborator and can safely change/revoke membership |
| M3 — Document editing and persistence | Rich-text editor, structured content, autosave, save state, stale-write protection | Tiptap editor route and debounced autosave implemented on this branch; CI and runtime verification pending | Edits survive refresh and concurrent stale saves return a conflict instead of overwriting |
| M4 — Review and revision workflow | Comments, anchored comments, resolve/reopen, document status transitions, revision history/restore | Basic comment and revision APIs exist; full UI/workflow planned | Reviewers can comment; permitted editors manage status; old versions can be restored safely |
| M5 — Real-time collaboration | Yjs document model, WebSocket provider, presence, reconnect/recovery, server-side authorization | Planned | Two clients can edit concurrently and converge after reconnect |
| M6 — Export and file handling | PDF/DOCX export, templates, background jobs, object storage, export history | Planned; MinIO is configured for local development | Exported file opens correctly and preserves document structure |
| M7 — Academic assistance | Opt-in outline suggestions, writing feedback, citation assistance, source-aware suggestions | Planned | AI output is reviewable, source-aware where applicable, and never silently replaces user text |
| M8 — Release readiness | Accessibility, observability, backups, rate limits, security headers, deployment/runbooks | Partial foundation; verification required | Reproducible release, documented recovery, security and accessibility checks pass |

## Current implementation focus: M3 writing experience (M1–M2 verification still required)

### Delivered on this development branch

- M2 adds a `ProjectInvitation` data model and migration with seven-day expiry, lifecycle state, assignable roles, and a SHA-256 token hash; the raw invitation token is returned only at creation.
- M2 adds owner-authorized endpoints to create/list/revoke invitations, list members, change non-owner member roles, and remove non-owner members. Authenticated invitees can accept or decline a token only when their account email matches the invited email.
- M2 adds a responsive team panel to the dashboard for member roles, invitation creation, one-time token display/copy, invitation status, revocation and acceptance.
- M3 adds a dedicated `/documents/:documentId` editor route with Tiptap formatting controls, document title/status editing, comments, revision history and restore controls.
- M3 autosaves after a short typing pause, sends `expectedUpdatedAt` with writes, exposes save states, and stops automatic retries on a version conflict. Revision restores now also use a version precondition and return a conflict instead of overwriting a newer edit.
- M1 input validation now rejects whitespace-only display names, project names, document titles and comment bodies.
- Document status updates now follow an explicit transition matrix. Only the project owner can archive or reopen archived documents; invalid transitions return HTTP 400.
- Added optional `expectedUpdatedAt` to the document update DTO. Clients can send the ISO-8601 `updatedAt` value returned by the document API.
- Document updates compare the supplied version against the loaded record and use a conditional database write. If the document changes before the write, the API responds with HTTP 409 and a stable `DOCUMENT_VERSION_CONFLICT` code instead of silently overwriting newer content.
- The update and revision creation happen in a transaction, so a failed conditional write rolls back the attempted revision as well.
- For backward compatibility, the version precondition remains optional for existing clients. New editor clients should always send it; making it mandatory is a later API-versioning decision.

### Required verification before merging

1. Confirm whitespace-only display names, project names, document titles and comment bodies return HTTP 400.
2. Confirm editors cannot archive or reopen documents and invalid status transitions return HTTP 400.
3. Install dependencies, generate the Prisma client, and run API/web typecheck, lint, and build.
4. Apply the new invitation migration against a clean PostgreSQL database and an existing development database.
5. Verify owners can invite and revoke; non-owners cannot manage invitations or membership; owner role cannot be assigned, changed or removed.
6. Verify expired, reused, revoked and wrong-email tokens are rejected, and a valid token creates exactly one membership.
7. Verify a normal document update succeeds and a stale `expectedUpdatedAt` returns HTTP 409 without changing content or adding a revision.

## Module delivery sequence

### M1.1 — API correctness and access baseline
- Validate DTO boundaries and consistent API errors.
- Define a role/operation matrix and test every protected route.
- Verify JWT secret configuration and authentication throttling.
- Add conflict-safe writes and tests for unauthorized access and stale updates.

### M2.1 — Membership invitations
- Implemented: invitation records, hashed tokens, expiry, create/list/accept/decline/revoke, member list, role changes and removal.
- Implemented: owner-only management and email match on acceptance.
- Remaining: send actual email invitations, add resend/expired-state cleanup, and verify lifecycle/concurrency behavior with automated tests.

### M3.1 — Writing experience
- Implemented on this branch: Tiptap editor using the existing document JSON format; formatting toolbar; editable title; debounced autosave and save-state indicators.
- Implemented on this branch: conflict detection and reload path for stale writes; version-preconditioned revision restoration; revision history and restore controls; basic comment list, create, resolve and reopen controls; document status selector.
- Remaining: verify save/restore races, add focused editor and API tests, test against a live PostgreSQL database, improve local-draft recovery and unsaved-navigation warnings, and add contextual text anchors for comments.

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
