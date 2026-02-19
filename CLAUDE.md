# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Backend API for Paz Church Curitiba, built with NestJS 11, TypeORM, and PostgreSQL 16.

## Common Commands

```bash
# Install dependencies
npm install

# Development server (watch mode)
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Run all unit tests
npm run test

# Run a single test file
npx jest src/announcements/announcements.controller.spec.ts

# Run tests in watch mode
npm run test:watch

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Lint (with auto-fix)
npm run lint

# Format
npm run format

# Start local PostgreSQL
docker compose up -d
```

## Architecture

**NestJS modular structure** — each domain feature lives in `src/<feature>/` with the standard NestJS pattern:
- `<feature>.module.ts` — module definition
- `<feature>.controller.ts` — REST controller (all routes prefixed with `/api` via global prefix in `main.ts`)
- `<feature>.service.ts` — business logic
- `entities/<name>.entity.ts` — TypeORM entity
- `dto/create-<name>.dto.ts` / `dto/update-<name>.dto.ts` — request DTOs

**Feature modules:** auth, users, roles, addresses, announcements, contributions, events, home

**Database:**
- TypeORM with PostgreSQL. Config in `src/configs/orm.config.ts` (used by the app) and `src/configs/data.source.ts` (used by TypeORM CLI for migrations).
- Migrations live in `database/migrations/` and run from compiled JS in `dist/database/migrations/`.
- Entities must be registered in `orm.config.ts`'s `entities` array when added.
- Environment variables: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_SYNCHRONIZE`, `DB_LOGGING`.

**Authentication:**
- Social login (Google, Apple) via `src/auth/`. Google tokens verified with `google-auth-library`. Apple tokens cryptographically verified via JWKS (`jwks-rsa`) against Apple's public keys — never just decoded.
- JWT access/refresh token flow. Access tokens (24h) and refresh tokens (30d) issued via `jsonwebtoken` directly with explicit `HS256` algorithm (not `@nestjs/jwt` signing).
- `JwtStrategy` (Passport) validates access tokens from `Authorization: Bearer` header with `algorithms: ['HS256']`. Protected routes use `@UseGuards(AuthGuard('jwt'))`.
- Refresh tokens are SHA-256 hashed before storage in `user_accounts` table (`UserAccount` entity). On lookup, incoming tokens are hashed and compared against the stored hash.
- Input validation enforced via DTOs (`SocialLoginDto`, `RefreshTokenDto`) with `class-validator`. Global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted` enabled.
- Rate limiting via `@nestjs/throttler` (20 req/min short, 500 req/hr long) applied globally.
- Security headers via `helmet` middleware.
- CORS configured via `CORS_ORIGIN` env var (defaults to `*` in development).
- Env vars (required): `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `GOOGLE_CLIENT_ID`.
- Env vars (optional): `APPLE_BUNDLE_ID` (Apple token audience verification), `CORS_ORIGIN`.

**Roles:** admin, pastor, area_leader, sector_leader, life_group_leader, member (seeded via migration).

## Entity Column Naming

All entity properties MUST use `camelCase` with explicit `@Column({ name: 'snake_case' })` mapping. Some older entities (Announcement, Contribution, Event) still use `snake_case` properties directly — these should be migrated when touched. New entities and new columns must always follow the `camelCase` property + `snake_case` name mapping pattern.

## snake_case vs camelCase — Convention

`snake_case` is the **API JSON transport layer** convention only. It does not leak into internal TypeScript code:

- **Entity properties**: always `camelCase` (e.g., `socialMedia`, `updatedAt`)
- **Service / business logic code**: always `camelCase`
- **Request DTOs** (`CreateXDto`, `UpdateXDto`): use `@Expose({ name: 'snake_case_key' })` to map incoming snake_case JSON body → camelCase TS properties
- **Response DTOs** (`XResponseDto`): use `@Expose({ name: 'snake_case_key' })` to serialize camelCase TS properties → snake_case JSON response
- **Controllers** that return plain objects already shaped in snake_case (via a `toResponse()` helper): annotate with `@SerializeOptions({ strategy: 'exposeAll', excludeExtraneousValues: false })` to bypass the global `excludeAll` serializer strategy

Never name a TypeScript entity property or service variable in snake_case — keep all internal TypeScript code camelCase and let the DTO layer handle the boundary conversion.

## Security Conventions

- **JWT secrets**: Must be provided via environment variables (`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`). No fallback defaults — app fails to start if missing. Secrets should be 32+ characters.
- **JWT algorithm**: Always use explicit `HS256` for signing and `algorithms: ['HS256']` for verification to prevent algorithm confusion attacks.
- **Token storage**: Never store plaintext tokens in the database. Always hash (SHA-256) before persisting.
- **Social login verification**: Google tokens verified via `google-auth-library`. Apple tokens MUST be cryptographically verified via JWKS — never just decoded.
- **Error handling**: Use `catch (error: unknown)` with `instanceof Error` checks. Never leak internal error details to clients.
- **Dependencies**: `helmet` for security headers, `@nestjs/throttler` for rate limiting, `jwks-rsa` for Apple JWKS key fetching.

## Testing

Tests use Jest with `@nestjs/testing`'s `Test.createTestingModule`. Unit test files are colocated with source as `*.spec.ts`. The Jest `rootDir` is `src/`. A `moduleNameMapper` for `^src/(.*)$` is configured in `package.json` to resolve path aliases in tests.
