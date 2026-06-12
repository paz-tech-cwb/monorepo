# Member Journey Steps

The member journey tracks discipleship progression through eight ordered steps. Each member has a status per step: `pending`, `in_progress`, or `completed`.

Steps are defined in the backend (`member-journey` module) and mapped to display labels in the mobile app (`MemberJourneyRepositoryImpl.stageKeyTitle`).

---

## Step definitions

| Order | Key | Label (PT-BR) | Description | Target audience |
|---|---|---|---|---|
| 1 | `registration` | Cadastro | Member created their account but hasn't completed their profile | All new users |
| 2 | `salvation` | Salvação | Member made a faith decision; first milestone in the journey | Members who responded to an altar call |
| 3 | `first_courses` | Primeiros Cursos | Introductory discipleship courses in the Academy section | New believers |
| 4 | `discovery` | Evento de Descoberta | Church discovery event explaining vision, values, and next steps | Members in the first 90 days |
| 5 | `life_group` | Life Group | Connection to a small group (Life Group) for ongoing community | All active members |
| 6 | `water_baptism` | Batismo nas Águas | Water baptism as a public declaration of faith | Members who haven't been baptized |
| 7 | `discipleship` | Discipulado | One-on-one or small discipleship relationship | Members connected to a Life Group |
| 8 | `disciple_maker` | Fazedor de Discípulos | Member actively discipling at least one other person | Mature members |

---

## Automatic reminder behavior

The `member_journey` reminder rule monitors members who are **stuck** on a configured step for more than the configured number of days (`days` field per step). When the threshold is exceeded:

- The backend dispatches a push notification with the configured `title` and `message`.
- Category: `member_journey` → app opens **Minha Jornada** screen.
- Idempotency: each `(member, step)` pair is notified **at most once** (tracked in `reminder_dispatch_log`).

> To re-send to a member who was already notified, delete the corresponding row from `reminder_dispatch_log` where `rule_type = 'member_journey'` and `dedupe_key = 'journey:{userId}:{stepKey}'`.

---

## Default days per step (suggested)

| Step | Suggested threshold |
|---|---|
| `registration` | 7 days |
| `salvation` | 14 days |
| `first_courses` | 30 days |
| `discovery` | 30 days |
| `life_group` | 21 days |
| `water_baptism` | 60 days |
| `discipleship` | 30 days |
| `disciple_maker` | 90 days |

These are starting points — pastors should adjust based on church rhythm and capacity.

---

## Adding a new step

1. Add the new `stage_key` to the backend's journey evaluation logic.
2. Add a `stageKeyTitle` mapping in `MemberJourneyRepositoryImpl.kt` (shared KMP).
3. Add a row to this document.
4. Optionally add it to the admin-ui `JOURNEY_STEPS` constant in `reminder-settings.tsx`.
