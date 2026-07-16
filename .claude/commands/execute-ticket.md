# Execute Ticket: $ARGUMENTS

You are executing a ticket end-to-end.

The ticket identifier or request is: **$ARGUMENTS**

Supported ticket inputs include Trello card URLs, short card codes, or card numbers when a default Trello board is configured. Example: `https://trello.com/c/00kgzQrB/2-whatsapp-integration`.

## Ship Pipeline
Read and follow the Ship Pipeline Agent definition:

1. Prefer `.claude/agents/ship-pipeline.md`.
2. If running in Codex, prefer `.codex/agents/ship-pipeline.md`.
3. Fall back to `agents/ship-pipeline.md` if installed there.
4. For backward compatibility only, `.claude/agents/orchestrator.md` and `.codex/agents/orchestrator.md` may point to the ship pipeline.

The ship pipeline owns the full flow:
- branch from updated `main`
- plan
- implement
- bounded quality loop: validate → review → fix
- request final approval
- commit on feature branch
- push feature branch
- merge back to `main`
- push `main` to trigger CI/deploy

Do not duplicate or override the ship pipeline flow here. If this command and the ship pipeline disagree, the ship pipeline wins.
