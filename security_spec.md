# Security Specification - Har's Portfolio

## Data Invariants
1. A project must have a title, type, and URL.
2. Only authorized administrators (verified via specific UID or a simple boolean, but here we can use a hardcoded check or a specific collection) can create, update, or delete projects.
3. Anyone can read project data.

## The "Dirty Dozen" Payloads (Examples)
1. Creating a project without a title.
2. Updating a project's `createdAt` timestamp.
3. Deleting a project as a non-authenticated user.
4. Injecting a massive string into the title field.
5. setting `type` to an invalid value (not video/website/game).
6. Spoofing the `ownerId` if it existed.
7. ...and others mentioned in the 8 pillars.

## Access Control
- Read: Public
- Write: Admin only (UID check or role check)
