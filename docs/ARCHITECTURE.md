# Architecture

## Core principle
The platform owns the canonical document state. Microsoft Word is a future integration/compatibility layer.

```text
Browser
  -> Next.js
  -> API (NestJS)
  -> PostgreSQL
  -> Redis
  -> Object Storage

Collaborative editor
  <-> Yjs/WebSocket service
  -> persistent document snapshots

Exports
  -> DOCX
  -> PDF

Future
  Microsoft Word Add-in / Microsoft Graph
  <-> Platform API
```

## Non-functional goals
- Multi-tenant-ready data model
- Role-based authorization
- Auditability and version history
- Idempotent background jobs
- Secure file handling
- Horizontal scaling for API and collaboration services
- Observability from the beginning
