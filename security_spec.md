# Security Specification for Har's Portfolio

## 1. Data Invariants
- Projects must have a `title`, `type`, `url`, and `createdAt`.
- Only admins (defined in `/admins/{uid}`) can create, update, or delete projects.
- `createdAt` must be set to `request.time` during creation and remains immutable.
- `id` must be a valid string matching `^[a-zA-Z0-9_\\-]+$`.

## 2. The Dirty Dozen Payloads (Target: `/projects/{projectId}`)

1. **Identity Spoofing**: Attempt to create a project without being logged in.
2. **Identity Spoofing**: Attempt to create a project being logged in but not an admin.
3. **Identity Spoofing**: Attempt to set `projectId` to a 1MB string.
4. **State Shortcutting**: Attempt to update `createdAt` of an existing project.
5. **Schema Violation**: Create a project missing required `title`.
6. **Schema Violation**: Create a project with invalid `type` (e.g., "malware").
7. **Schema Violation**: Create a project with a 2MB `description`.
8. **Relational Bypass**: Delete a project as a non-admin user.
9. **Relational Bypass**: List projects without proper auth (if restricted, though projects are public).
10. **Admin Escalation**: Attempt to create a document in `/admins/` as a normal user.
11. **Admin Escalation**: Attempt to update an admin's role to gain power.
12. **PII Leak**: Attempt to read private user info (if any existed, e.g., in `/users/private`).

## 3. Test Runner (Mock)
(Tests would be implemented in `firestore.rules.test.ts` using the emulator).
