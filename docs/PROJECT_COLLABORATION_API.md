# Project Collaboration API

All routes are prefixed with `/api/v1` and require a valid bearer access token unless otherwise stated. Request bodies are JSON. Project IDs, member IDs and invitation IDs are UUIDs.

## Owner-only management routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/projects/:projectId/members` | List project members (any member can view) |
| GET | `/projects/:projectId/invitations` | List invitation states |
| POST | `/projects/:projectId/invitations` | Create an invitation |
| DELETE | `/projects/:projectId/invitations/:invitationId` | Revoke a pending invitation |
| PATCH | `/projects/:projectId/members/:memberId/role` | Change a non-owner member's role |
| DELETE | `/projects/:projectId/members/:memberId` | Remove a non-owner member |

### Create an invitation

```http
POST /api/v1/projects/:projectId/invitations
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "email": "collaborator@example.com",
  "role": "EDITOR"
}
```

Allowed invitation roles: `EDITOR`, `REVIEWER`, `VIEWER`. The `OWNER` role cannot be granted through invitations or the member-role endpoint. Invitations expire after seven days. The response contains an `acceptanceToken` once; only a SHA-256 hash is stored in the database. The development UI offers a copy action because email delivery is not implemented yet. Treat the token like a secret and share it only with the intended collaborator.

## Invitee routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/invitations/accept` | Accept an invitation |
| POST | `/invitations/decline` | Decline an invitation |

Example request:

```json
{ "token": "<acceptanceToken>" }
```

The invitee must be signed in, and their account email must match the invitation email. Accepted invitations create a project membership and mark the invitation accepted in a database transaction. Expired, revoked, already-used and unknown tokens are rejected. A token is single-use.

## Role rules

- **OWNER:** can invite, revoke invitations, change roles, remove non-owner members, and perform owner-only project operations.
- **EDITOR:** can create and edit documents and participate in the existing comment workflow.
- **REVIEWER:** can review/comment using the existing comment API but cannot edit document content.
- **VIEWER:** read-only project access; cannot create or edit documents or resolve comments.

All permissions are enforced by the API; hiding a control in the UI is not a security boundary.

## Known limitations

- Email delivery, resend, and email verification are not implemented. Until email verification exists, invitation tokens must be delivered securely out of band.
- The dashboard currently manages the first project in the workspace. A dedicated project detail route will be needed to manage teams for multiple projects independently.
- Automated authorization and invitation lifecycle tests, concurrent-acceptance testing, and applying the migration to a real PostgreSQL database remain required before production use.
