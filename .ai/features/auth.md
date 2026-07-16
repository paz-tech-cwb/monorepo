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

## Agent notes

Any change to token shape, expiration, role mapping, or refresh behavior must update this doc and app-specific auth docs.
