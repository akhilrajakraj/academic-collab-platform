# Academic Collaboration Platform

A production-oriented foundation for collaborative academic writing.

## Vision
Students can create projects, divide documents into sections, collaborate in real time, review changes, manage references, and export the final work to PDF/DOCX. Microsoft Word integration is planned as a later compatibility layer rather than the core editor.

## Planned stack
- Web: Next.js + TypeScript
- API: NestJS + TypeScript
- Database: PostgreSQL
- Cache / presence / jobs: Redis
- Collaborative editing: Tiptap + Yjs
- Object storage: S3-compatible storage
- Auth: OIDC/OAuth-ready authentication
- Deployment: Docker, CI/CD, cloud-agnostic

## Repository structure
```text
apps/
  web/        # student/reviewer web application
  api/        # REST/WebSocket backend
packages/
  editor/     # shared editor/collaboration primitives
  shared/     # shared types, validation, constants
infra/
  docker/     # local infrastructure
  # future: terraform/k8s

docs/         # architecture and product documentation
```

## Product phases
1. Project/workspace management
2. Section assignment and permissions
3. Rich-text collaborative editing
4. Comments and version history
5. Document assembly
6. PDF/DOCX export
7. Supervisor/reviewer workflows
8. Microsoft Word / Microsoft 365 integration
9. AI-assisted academic workflows

## Status
Planning / architecture stage. No production deployment yet.
