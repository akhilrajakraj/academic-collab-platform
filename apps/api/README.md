# API

NestJS REST API for Academic Collab Platform.

## Local development

From the repository root:

```bash
pnpm install
cp .env.example .env
# Replace JWT_SECRET with a cryptographically random value of at least 32 characters.
docker compose -f infra/docker/docker-compose.yml up -d
pnpm --filter @academic-collab/api prisma:generate
pnpm db:migrate
pnpm dev:api
```

The API defaults to port `4000` and uses the `/api/v1` prefix.

## Authentication

- `POST /api/v1/auth/register` — create an account using email, display name, and a password of at least 10 characters.
- `POST /api/v1/auth/login` — exchange credentials for a short-lived bearer access token.
- `GET /api/v1/auth/me` — retrieve the authenticated account.

All project, document, revision, and comment endpoints require `Authorization: Bearer <accessToken>`. Passwords are hashed with bcrypt. The token lifetime defaults to one hour and can be configured using `JWT_EXPIRES_IN_SECONDS`.

## Project and document endpoints

- `GET /api/v1/projects` — list projects for the authenticated account.
- `POST /api/v1/projects` — create a project and make the account its owner.
- `GET /api/v1/projects/:projectId` — get a project the account belongs to.
- `PATCH /api/v1/projects/:projectId` and `DELETE /api/v1/projects/:projectId` — owner-only project changes.
- `GET /api/v1/projects/:projectId/documents` — list project documents.
- `POST /api/v1/projects/:projectId/documents` — create a document.
- `GET /api/v1/projects/:projectId/activity` — recent project activity.
- `GET /api/v1/documents/:documentId` — get a document.
- `PATCH /api/v1/documents/:documentId` — update document title, content, or status; title/content edits snapshot the previous version.
- `DELETE /api/v1/documents/:documentId` — delete a document.
- `GET /api/v1/documents/:documentId/revisions` — list previous document versions.
- `POST /api/v1/documents/:documentId/revisions/:revisionId/restore` — restore a revision while snapshotting the current version.
- `GET /api/v1/documents/:documentId/comments` and `POST` — list/add document comments.
- `PATCH /api/v1/comments/:commentId` with `{ "resolved": true }` — resolve or reopen a comment.
- `DELETE /api/v1/comments/:commentId` — delete your comment, or an editor/owner can moderate comments.

DTOs are validated at the API boundary. Project membership is checked before protected resource access; owners can manage projects, and owners/editors can modify documents.

## Security limitations

This is an early development implementation. Before production use, add email verification, password reset/account recovery, token revocation/refresh strategy, security logging, and automated authentication/authorization tests. Registration and login currently use a basic in-memory per-process rate limit; use a shared store and reverse-proxy protections for multi-instance production deployments. Configure HTTPS and a production-grade secret manager. Do not deploy with the example JWT secret.
