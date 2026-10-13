# Academic Collab Platform

A collaborative writing workspace for students to plan projects, write documents together, review revisions, and export final work.

## Current implementation

The current development slice includes:

- Responsive Next.js workspace dashboard with project navigation, document search/status filtering, activity, and document creation.
- NestJS REST API with `/api/v1` routing, DTO validation, and health endpoint.
- PostgreSQL persistence through Prisma, including an initial SQL migration.
- Project CRUD endpoints with owner membership checks.
- Document CRUD endpoints with project membership checks, activity events, and revision snapshots when document title/content changes.
- A local demo identity to exercise the workflow without authentication; it is blocked in production mode.
- Shared TypeScript contracts and GitHub Actions validation workflow.

**Still planned:** production authentication, collaborator invitation/membership management UI, a rich-text editor, autosave, revision restore, comments, real-time multi-user editing, PDF/DOCX export, notifications, and AI features. The dashboard is API-backed for projects/documents but remains a development preview.

## Technology

- Web: Next.js, React, TypeScript
- API: NestJS, TypeScript
- Data: PostgreSQL, Prisma
- Local infrastructure: Docker Compose, Redis, MinIO
- Planned editor: Tiptap + Yjs

## Requirements

- Node.js 20+
- pnpm 10+
- Docker Desktop (for PostgreSQL, Redis, and MinIO)

## Getting started

1. Copy `.env.example` to `.env`. The included demo identity is for local development only.
2. Start infrastructure: `docker compose -f infra/docker/docker-compose.yml up -d`.
3. Install dependencies: `pnpm install`.
4. Generate Prisma Client: `pnpm --filter @academic-collab/api prisma:generate`.
5. Apply the initial migration: `pnpm db:migrate`.
6. Start the API: `pnpm dev:api`.
7. In a second terminal, start the web app: `pnpm dev:web`.

The web app runs on port 3000 and the API on port 4000 by default. The dashboard creates an initial “AI in Education” project if the demo identity has no projects.

## Repository layout

```text
apps/
  web/                 Next.js application
  api/                 NestJS API, Prisma schema, and migrations
packages/
  shared/              Shared TypeScript contracts
  editor/              Planned editor package
infra/docker/          Local infrastructure
docs/                  Product and architecture documentation
```

## Project principles

- Clearly distinguish implemented capabilities from planned work.
- Validate API input and enforce project membership for protected resources.
- Never commit real secrets or deploy the demo identity.
- Preserve document revisions and make collaboration changes auditable.
- Meet keyboard accessibility and reduced-motion expectations.
