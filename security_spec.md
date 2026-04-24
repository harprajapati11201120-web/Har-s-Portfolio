# Security Specification

## Data Invariants
1. A project must have a title, type, url, and posterUrl.
2. Only authorized administrators (verified email) can create, update, or delete projects.
3. Reading project list is public.
4. Timestamps (createdAt) must be set by the server.

## The Dirty Dozen Payloads (Unauthorized Attempts)
1. Creating a project without authentication.
2. Deleting a project as a non-admin user.
3. Updating a project's `title` with a 2MB string (Resource Poisoning).
4. Creating a project with a spoofed `createdAt` client timestamp.
5. Updating a project to change its `id` (Immortality breach).
6. Creating a project with an invalid `type` (e.g., "virus").
7. Injecting a script tag into the `title` field.
8. Listing projects while impersonating another user's private data (not applicable here, but good to test).
9. Attempting to update `posterUrl` to a non-string value.
10. Creating a project with a 2000-character long ID.
11. Deleting the entire `projects` collection in a single batch without permissions.
12. Updating `type` to an invalid enum value.

## Implementation Plan
- Use `isValidProject()` helper for all writes.
- Enforce `request.auth.token.email_verified == true`.
- Use `affectedKeys().hasOnly()` for updates.
- Use server-side timestamps.
