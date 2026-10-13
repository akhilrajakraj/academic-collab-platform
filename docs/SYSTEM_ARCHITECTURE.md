# System Architecture and Implementation Plan

## Current status

The repository is at the architecture/scaffolding stage. This document describes the intended first implementation slice; it does not claim planned features are already implemented.

## Product goals

Academic Collab Platform helps students write documents together, organize projects, review changes, and export a final PDF. The initial release should prioritize a reliable project/document workflow before real-time collaboration and advanced integrations.

## Architecture

- **Web:** Next.js App Router, React, TypeScript.
- **API:** NestJS, TypeScript, versioned REST endpoints under `/api/v1`.
- **Database:** PostgreSQL with Prisma as the schema/migration layer.
- **Cache and jobs:** Redis; add a queue worker when background exports are implemented.
- **Editor:** Tiptap; Yjs collaboration is a planned phase, not assumed operational.
- **Object storage:** S3-compatible storage (MinIO locally) for exported PDFs and uploaded assets.
- **Authentication:** OIDC/OAuth integration in a later slice; do not treat mock/local UI identity as production authentication.
- **Deployment:** Docker Compose for local dependencies; CI should lint, type-check, test, and build each workspace.

## Suggested monorepo boundaries

- `apps/web`: user-facing Next.js application.
- `apps/api`: NestJS REST API and Prisma schema.
- `packages/shared`: shared contracts, validation schemas, and types.
- `packages/editor`: reusable editor configuration and extensions.
- `infra/docker`: local infrastructure.
- `docs`: product, architecture, and delivery decisions.

## Core domain

- **User** belongs to projects through **ProjectMember**.
- **Project** groups documents and collaborators.
- **Document** stores title, structured content, status, and project ownership.
- **DocumentRevision** records saved versions and authorship.
- **Comment** anchors feedback to a document.
- **Activity** records meaningful project/document events.

Use UUID identifiers, UTC timestamps, explicit membership roles, and database constraints for ownership and relationships.

## API conventions

- Prefix endpoints with `/api/v1`.
- Provide `GET /api/v1/health` for liveness.
- Validate request DTOs at the boundary.
- Return consistent HTTP status codes and avoid exposing internal errors.
- Add authentication and project-membership authorization before exposing real user data.
- Paginate lists and make document writes auditable.

## Delivery sequence

1. **Foundation:** workspace scripts, environment template, health endpoint, database schema, and a clear web entry point.
2. **Project workflow:** authentication, project CRUD, membership/roles, document CRUD, and persistence.
3. **Writing workflow:** editor, autosave, revision history, comments, and export jobs.
4. **Collaboration:** Yjs/WebSocket collaboration, presence, conflict handling, and activity feed.
5. **Hardening:** authorization tests, rate limits, observability, backups, accessibility, and deployment.

## Non-goals for the first slice

Do not claim live multi-user editing, production authentication, real PDF export, notifications, or AI assistance until those capabilities are implemented and tested. Keep the UI explicit about demo/local-only actions.

## Quality gates

- Install reproducibly from the lockfile.
- Lint and type-check every workspace.
- Test health and core domain behavior.
- Run database migrations from a clean database in CI.
- Keep secrets out of source control and provide safe environment defaults.
