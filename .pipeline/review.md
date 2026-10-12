# Review (Sattler, self-validation)

- Authorization: scope only grows for rows where the user is `leader_id`/`co_leader_id`; admin/pastor branch untouched and first; empty scope otherwise (tested + real DB). `@Roles` guards untouched.
- No N+1: `findMine` is one query; resolver is 3 parallel finds + 2 `IN` queries.
- `/me` response: existing keys unchanged, 2 new keys (test). Old clients ignore them.
- Risks: slug-less leaders now see scoped lists (see changes.md); `findOne` adds one small query per detail call; `/me` for a supervisor of hundreds of groups returns all of them with rosters (client caps the home card; consider pagination or dropping rosters for supervised groups if payload grows).
- Open: home card ranking/cap for supervisors (product).
