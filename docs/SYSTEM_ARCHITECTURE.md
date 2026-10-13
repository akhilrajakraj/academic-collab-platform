# System Architecture and Implementation Plan

## Current status

Phase 1 foundation and a first Phase 2 slice are committed. The repository now has a Next.js API-backed dashboard, a NestJS REST API, Prisma/PostgreSQL persistence, project/document endpoints, project membership checks, activity records, and document revision snapshots. The demo identity is for local development only and is blocked in production mode.

Production authentication, invitation management, a rich-text editor, live collaboration, comments, export, and AI features remain planned.

## Product goals

Academic Collab Platform helps students organize academic projects, write documents together, review changes, and assemble final submissions. Prioritize a reliable, auditable project/document workflow before real-time collaboration and advanced integrations.

## Architecture

- **Web:** Next.js App Router, React, TypeScript.
- **API:** NestJS, TypeScript, versioned REST endpoints under `/api/v1`.
- **Database:** PostgreSQL with Prisma schema and checked-in SQL migrations.
- **Cache and jobs:** Redis; add a queue worker when background exports are implemented.
- **Editor:** Tiptap; Yjs collaboration remains a planned phase.
- **Object storage:** S3-compatible storage (MinIO locally) for exported PDFs and uploaded assets.
- **Authentication:** email/password registration and JWT bearer authentication are now implemented; production hardening, email verification, recovery, and rate limiting remain required before deployment.
- **Deployment:** Docker Compose for local dependencies; GitHub Actions type-checks, lints, and builds workspaces.

## Monorepo boundaries

- `apps/web`: user-facing Next.js application.
- `apps/api`: NestJS REST API, Prisma schema, migrations, and domain services.
- `packages/shared`: shared contracts and types.
- `packages/editor`: future reusable editor configuration and extensions.
- `infra/docker`: local infrastructure.
- `docs`: product, architecture, and delivery decisions.

## Core domain

- **User** belongs to projects through **ProjectMember**.
- **Project** groups documents and collaborators.
- **Document** stores title, structured JSON content, status, and project ownership.
- **DocumentRevision** stores a snapshot of the previous title/content on document content or title updates.
- **Comment** is modeled for future anchored feedback.
- **Activity** records project creation and document changes.

IDs are UUIDs; timestamps are stored in UTC; membership roles and foreign keys define project ownership and data relationships.

## API conventions

- Prefix endpoints with `/api/v1`.
- Validate DTOs with NestJS validation pipes.
- Return consistent HTTP status codes and avoid exposing internal errors.
- Check project membership before project/document reads and writes.
- Owners can update/delete projects; owners/editors can create, update, and delete documents.
- Document title/content updates create a revision snapshot in the same database transaction as the update.

## Delivery sequence

1. **Foundation — implemented:** workspace scripts, environment template, health endpoint, database schema, and dashboard shell.
2. **Project/document workflow — first slice implemented:** project CRUD, demo owner membership, document CRUD, activity, revisions, and dashboard API integration.
3. **Identity and team workflow — first slice implemented:** bcrypt password registration/login, JWT bearer guard, authenticated account profile, and protected project/document/comment endpoints. Next: email verification, password recovery, rate limiting, invitation and member-management UI, and authorization tests.
4. **Writing workflow — API slice added:** document comments can be listed/created/resolved/deleted with membership checks; prior revisions can be restored while preserving the pre-restore version. Tiptap editor, autosave, comment anchoring UI, and export jobs remain planned.
5. **Collaboration:** Yjs/WebSocket collaboration, presence, conflict handling, and robust activity feed.
6. **Hardening:** authorization tests, rate limits, observability, backups, accessibility, and deployment.

## Security boundary

The demo identity is not authentication. It is blocked when `NODE_ENV=production`, but this is a development convenience, not a substitute for session/token authentication. Do not deploy the API or use it with real student data until authentication, CSRF/CORS policy as appropriate, rate limits, and production authorization are implemented and tested.

## Quality gates

- Install reproducibly from the lockfile.
- Type-check and build each workspace.
- Test health, project membership, document writes, and revision creation.
- Apply migrations from a clean PostgreSQL database in CI.
- Keep secrets out of source control and provide safe environment defaults.
