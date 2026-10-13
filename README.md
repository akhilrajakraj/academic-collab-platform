# Academic Collab Platform

A collaborative writing workspace for students to plan projects, write documents together, review revisions, and export final work.

## Current implementation

The repository is being built incrementally. The current foundation includes:

- A responsive Next.js dashboard preview with recent documents, search, status filtering, activity, and a local-only create-document dialog.
- A NestJS API bootstrap with a versioned health endpoint at `GET /api/v1/health`.
- A Prisma schema describing users, projects, project memberships, documents, revisions, comments, and activity.
- A shared TypeScript contract package.
- A system architecture and delivery plan in `docs/SYSTEM_ARCHITECTURE.md`.

**Not yet implemented:** production authentication, project/document persistence services, real-time multi-user editing, comments API, PDF export, notifications, and AI features. The dashboard currently uses sample data and browser state; it is not connected to the API yet.

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

1. Copy `.env.example` to `.env` and adjust values.
2. Start local infrastructure with `docker compose -f infra/docker/docker-compose.yml up -d`.
3. Install dependencies using `pnpm install`.
4. Generate Prisma Client with `pnpm --filter @academic-collab/api prisma:generate`.
5. Start the API with `pnpm --filter @academic-collab/api dev`.
6. In another terminal, start the web app with `pnpm --filter @academic-collab/web dev`.

The web app runs on port 3000 and the API on port 4000 by default.

## Repository layout

```text
apps/
  web/                 Next.js application
  api/                 NestJS API and Prisma schema
packages/
  shared/              Shared TypeScript contracts
  editor/              Planned editor package
infra/docker/          Local infrastructure
docs/                  Product and architecture documentation
```

## Project principles

- Make implementation status explicit; do not present planned capabilities as complete.
- Validate inputs at API boundaries and enforce project membership on every protected resource.
- Keep secrets out of source control.
- Preserve document revisions and make collaboration changes auditable.
- Meet keyboard accessibility and reduced-motion expectations.
