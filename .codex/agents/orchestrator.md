# Orchestrator Agent

This agent has been renamed to **Ship Pipeline Agent**.

Use `.codex/agents/ship-pipeline.md` as the source of truth.

The ship pipeline owns:
- branch from updated `main`
- plan
- implement
- bounded quality loop: validate → review → fix
- final approval
- commit, push feature branch, merge to `main`, push `main`
