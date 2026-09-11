# Feature: Authentication

## Purpose

Provide one authentication model across admin and mobile clients using Firebase identity and backend-issued application tokens.

## Flow

1. Client authenticates through Firebase Auth.
2. Client exchanges Firebase ID token at `POST /api/auth/social-login`.
3. Backend verifies Firebase identity and maps/creates the application user.
4. Backend returns JWT access token and refresh token.
5. Client stores tokens locally according to platform best practices.
6. Client refreshes on `401` using `POST /api/auth/refresh`.

## Backend responsibilities

- Verify Firebase ID tokens.
- Issue and validate JWT access tokens.
- Hash refresh tokens with SHA-256 before storing.
- Enforce role/permission checks.
- Keep role names canonical.

## Client responsibilities

- Never call protected APIs without a valid access token.
- Refresh once on `401`, then retry if refresh succeeds.
- Clear local auth state if refresh fails.
- Do not invent role names locally; map display roles intentionally.

## Identity matching (social login)

`POST /api/auth/social-login` accepts an optional `birth_date` alongside `id_token`/`provider` (Firebase tokens never carry birth date). Before falling back to email lookup, the backend tries to match an existing `User` by case-insensitive, trimmed `name` + exact `birth_date`:

- A single match links the Firebase identity to that user (email/picture updated) instead of creating a duplicate account.
- No match falls back to matching by email, then to creating a new user (which requires `birth_date` to be present).
- Multiple matches (ambiguous name+birthDate collision) are never auto-linked — the login falls back to email matching / creates a new, unlinked identity, and a warning is logged for admin review.
- Existing rows with a null `birth_date` are excluded from this matching path (email matching still applies).

## Agent notes

Any change to token shape, expiration, role mapping, or refresh behavior must update this doc and app-specific auth docs.
