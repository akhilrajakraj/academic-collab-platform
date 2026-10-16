# Academic Collab Platform

A collaborative writing workspace for students to plan projects, write documents together, review revisions, and assemble final submissions.

## Current implementation

- Responsive Next.js workspace dashboard with search, status filters, activity, and API-backed document creation.
- Email/password registration and login endpoints using bcrypt password hashing and signed JWT bearer tokens.
- A sign-in/register UI; access tokens are held in session storage for the browser session.
- Protected project, document, revision, and comment endpoints use the authenticated account identity.
- PostgreSQL persistence via Prisma with an initial schema and migrations.
- Project CRUD with owner membership checks, document CRUD, activity records, revision snapshots and restoration, and comment APIs.
- GitHub Actions workflow for workspace validation.

**Still planned:** invitation/member-management UI, Tiptap rich-text editor, autosave, real-time collaboration with Yjs, anchored comment UI, PDF/DOCX export, notifications, AI features, email verification, password recovery, rate limiting, and production security hardening. Registration and login are an initial authentication slice, not yet a complete production identity system.

## Technology

- Web: Next.js, React, TypeScript
- API: NestJS, TypeScript, JWT, bcrypt
- Data: PostgreSQL, Prisma
- Local infrastructure: Docker Compose, Redis, MinIO
- Planned editor: Tiptap + Yjs

## Requirements

- Node.js 20+
- pnpm 10+
- Docker Desktop

## Getting started

1. Copy `.env.example` to `.env`.
2. Replace `JWT_SECRET` with a cryptographically random secret at least 32 characters long. Never deploy with the example value.
3. Start local infrastructure: `docker compose -f infra/docker/docker-compose.yml up -d`.
4. Install dependencies: `pnpm install`.
5. Generate Prisma Client: `pnpm --filter @academic-collab/api prisma:generate`.
6. Apply migrations: `pnpm db:migrate`.
7. Start the API: `pnpm dev:api`.
8. In another terminal, start the web app: `pnpm dev:web`.

The web app runs on port 3000 and API on port 4000 by default. Create an account in the browser to begin. The first account has no projects initially; the dashboard creates a starter project on first sign-in if the account has none.

## Repository layout

```text
apps/web/                 Next.js application
apps/api/                 NestJS API, Prisma schema and migrations
packages/shared/          Shared TypeScript contracts
packages/editor/          Planned reusable editor package
infra/docker/             Local PostgreSQL, Redis, MinIO
docs/                     Product and architecture documentation
```

## Security principles

- Never commit real secrets.
- Use a unique password and a strong local JWT secret.
- Authentication includes basic per-process throttling for registration/login; email verification and recovery flows are still missing.
- Do not deploy this early development release with real student data before security review and automated authorization tests.


## Development roadmap

The implementation is divided into independently reviewable modules covering platform foundation, identity and access control, project membership, document editing, review and revisions, real-time collaboration, export, academic assistance, and release readiness. See [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md) for current status, delivery order, verification criteria, and end-to-end acceptance scenario.
