# API

NestJS REST API for Academic Collab Platform.

## Local development

Install workspace dependencies from the repository root and configure `DATABASE_URL` in your environment. The API defaults to port `4000`.

- `GET /api/v1/health` — returns service health and an ISO timestamp.

## Database

The initial Prisma schema lives in `prisma/schema.prisma`. Generate Prisma Client and create a migration before connecting application services to the database.

## Security status

Authentication, authorization guards, and persistence services are not yet wired into the API. Do not expose it publicly with real student data until those are implemented.
