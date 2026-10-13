# API

NestJS REST API for Academic Collab Platform.

## Local development

From the repository root:

```bash
pnpm install
cp .env.example .env
docker compose -f infra/docker/docker-compose.yml up -d
pnpm --filter @academic-collab/api prisma:generate
pnpm db:migrate
pnpm dev:api
```

The API defaults to port `4000` and uses the `/api/v1` prefix.

## Endpoints

- `GET /api/v1/health` — service health.
- `GET /api/v1/projects` — list projects for the current local demo identity.
- `POST /api/v1/projects` — create a project and make the demo identity its owner.
- `GET /api/v1/projects/:projectId` — get a project the current identity belongs to.
- `PATCH /api/v1/projects/:projectId` and `DELETE /api/v1/projects/:projectId` — owner-only project changes.
- `GET /api/v1/projects/:projectId/documents` — list project documents.
- `POST /api/v1/projects/:projectId/documents` — create a document.
- `GET /api/v1/projects/:projectId/activity` — recent project activity.
- `GET /api/v1/documents/:documentId` — get a document.
- `PATCH /api/v1/documents/:documentId` — update document title, content, or status; content/title edits snapshot the previous version.
- `DELETE /api/v1/documents/:documentId` — delete a document.
- `GET /api/v1/documents/:documentId/revisions` — list previous document versions.
- `POST /api/v1/documents/:documentId/revisions/:revisionId/restore` — restore a revision after snapshotting the current version.
- `GET /api/v1/documents/:documentId/comments` and `POST` — list/add document comments.
- `PATCH /api/v1/comments/:commentId` with `{ "resolved": true }` — resolve or reopen a comment.
- `DELETE /api/v1/comments/:commentId` — delete your comment, or an editor/owner can moderate comments.

Request DTOs are validated at the API boundary. Project membership is checked for project/document reads and writes.

## Demo identity and security

For local development only, the API uses `DEMO_USER_EMAIL` and `DEMO_USER_NAME` from the environment. This demo identity is explicitly blocked when `NODE_ENV=production`. It is **not authentication**: do not expose this API to untrusted users or real student data. Configure real authentication and verify authorization before deploying.

## Persistence

Prisma schema: `prisma/schema.prisma`. The initial SQL migration is checked into `prisma/migrations`. Use `pnpm db:migrate` locally to apply it.
