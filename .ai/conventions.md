# Engineering Conventions

## Before editing

- Read `.ai/README.md` and the relevant feature/app files.
- Read submodule-specific instructions if editing inside a submodule.
- Check git status and avoid overwriting unrelated user work.
- In submodules, commit/push from inside the submodule repository when requested.

## Implementation boundaries

- Implement only the requested behavior.
- Do not add broad refactors, abstractions, or unrelated cleanup.
- Keep business rules in the backend unless the rule is purely presentational.
- Keep clients aligned with existing API contracts.

## Security

- Never commit secrets.
- Validate data at external boundaries: API requests, form inputs, auth tokens, file uploads, webhooks.
- Avoid command injection, SQL injection, XSS, insecure token storage, and overly broad CORS.
- Store refresh tokens as hashes only.

## Testing expectations

- Backend: run focused Jest tests when changing backend logic; run broader tests when shared modules change.
- Admin UI: run lint/build or focused checks when changing UI/API code.
- Mobile: run analyzer/tests for touched modules when practical.
- If a command cannot run locally, document why in `.pipeline/test-results.md`.

## Documentation updates

Update `.ai/` when a change affects:

- public API contracts;
- auth or role behavior;
- feature workflows;
- app boundaries;
- deployment/runtime commands;
- major data model decisions.

## Git/submodule workflow

- Root repository tracks submodule pointers.
- App changes belong inside their submodule repositories.
- Root-level documentation changes belong in the root repository.
- Do not push to `main` or `develop` directly.
