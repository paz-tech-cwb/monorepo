# Feature: People, Membership, and Member Journey

## Purpose

Manage church people records, member profiles, leadership roles, and discipleship progression.

## Core concepts

- A member belongs to the church community and may have role-based access.
- Leaders have scoped visibility through area, sector, and life group relationships.
- The member journey tracks discipleship progression through ordered steps.

## Member journey steps

| Order | Key | Label |
|---|---|---|
| 1 | `registration` | Cadastro |
| 2 | `salvation` | Salvação |
| 3 | `first_courses` | Primeiros Cursos |
| 4 | `discovery` | Evento de Descoberta |
| 5 | `life_group` | Life Group |
| 6 | `water_baptism` | Batismo nas Águas |
| 7 | `discipleship` | Discipulado |
| 8 | `disciple_maker` | Fazedor de Discípulos |

Each step can be `pending`, `in_progress`, or `completed`.

## Reminder behavior

The member journey reminder rule identifies members stuck on a configured step for more than the configured threshold. It sends a push notification with category `member_journey`, and mobile should navigate to Minha Jornada.

## Change checklist

- Backend role/cascade behavior updated and tested.
- Admin UI role labels and filters remain aligned with backend.
- Mobile journey labels/navigation remain aligned.
- Reminder changes update notification docs.
