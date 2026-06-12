# Formulários — Paz Church Curitiba

Design spec for the **Formulários** module across **backend**, **admin-ui**, and **mobile-app**.

On the mobile app, accessed via **Conta → Formulários**, where each role sees the list of forms they can fill, the history of their own submissions, and a button to create a new submission. On the admin, the same forms are listed with broader visibility according to role; admins also configure linked courses for the *Cadastro do Membro* form directly inside that form's page.

---

## 1. Roles

Backend roles (canonical):

| Role                | Description                                             |
| ------------------- | ------------------------------------------------------- |
| `admin`             | Full access (read/write all forms)                      |
| `pastor`            | Full read access (all forms), can fill any form         |
| `area_leader`       | Supervisor de Área — oversees multiple sectors          |
| `sector_leader`     | Supervisor de Setor — oversees multiple life groups     |
| `life_group_leader` | Líder de Life Group                                     |
| `member`            | Membro comum (não preenche formulários administrativos) |

**Visibility rule:** `admin` and `pastor` see all submissions of every form. Other roles see only what they created, plus what their *cascade scope* allows (area → all sectors/lifes inside; sector → all lifes inside; life leader → only their life).

---

## 2. Architecture Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **One table per form** (typed, no JSONB) | 8 forms is bounded; reporting/aggregation queries stay clean; strong typing end-to-end. |
| 2 | **One NestJS module per form** + shared `forms-core` | Predictable structure; isolated side effects per form. |
| 3 | **No form schema versioning machinery** for v1 | Forms are code-defined; field changes ship as migrations. |
| 4 | **No multiplication approval workflow** | Area leaders are trusted; auto-create new life on submit. Audit log is the safety net. |
| 5 | **24h edit window for submitters; admin can edit anytime; soft-delete only; all changes audit-logged** | Balances correction needs with data integrity. |
| 6 | **Email v1 (Resend), WhatsApp deferred to v2** | Onboarding works day-one without new vendor; `NotificationSender` interface keeps swap cheap. |
| 7 | **Email sender uses church contact email** from admin Configurações; fallback `DEFAULT_FROM_EMAIL` env var (default `contato@igrejapaz.com.br`) | Editable without redeploy. |
| 8 | **Course management lives inside the Cadastro do Membro admin page**, not a separate Cursos screen | Keeps related config in one place; courses are only used by this form in v1. |
| 9 | **Mobile drilldown UX**: Formulários list → per-form page with `Novo` + `Histórico` tabs | History is form-scoped, matching how users think about submissions. |
| 10 | **Admin hub UX**: single sidebar entry → cards for all forms, role-filtered | Sidebar stays clean; scales if more forms are added. |

---

## 3. Form Catalog

### 3.1. Cadastro do Membro

Form to register a new member. After submission, a `pending_user` record is created; when the person later logs in via Firebase, their profile is **pre-filled** and activated. On submit, system **sends onboarding email** with link to download the app (WhatsApp deferred to v2).

| Field               | Type           | Required | Notes                                                             |
| ------------------- | -------------- | -------- | ----------------------------------------------------------------- |
| `full_name`         | string         | yes      | SEM ABREVIAÇÕES                                                   |
| `birthday`          | date           | yes      |                                                                   |
| `phone`             | string (E.164) | yes      | reserved for WhatsApp v2                                          |
| `address`           | string         | yes      |                                                                   |
| `sector_id`         | uuid           | yes      | dropdown of sectors                                               |
| `life_group_id`     | uuid           | yes      | filtered by sector                                                |
| `discipulador_name` | string         | no       | Nome do seu discipulador (free text)                              |
| `completed_courses` | uuid[]         | no       | multi-select checkboxes; options come from `form_course_links` for this form |

**Side effects on submit**

- Create or update `User` (status: `pending_first_login`)
- Update *Trilho do Membro* based on completed courses
- Send onboarding email (Resend) with app store links
- Match by email/phone before insert to avoid duplicates

| Role              | Can write | Can read own | Can read all in scope |
| ----------------- | --------- | ------------ | --------------------- |
| admin             | ✅         | ✅            | ✅                     |
| pastor            | ✅         | ✅            | ✅                     |
| area_leader       | ✅         | ✅            | ✅                     |
| sector_leader     | ✅         | ✅            | ❌                     |
| life_group_leader | ✅         | ✅            | ❌                     |
| member            | ❌         | —            | —                     |

---

### 3.2. Conversão e Reconciliação com Jesus

Captures decisions for Christ. On submit, system tries to match an existing user by phone; if not found, **creates** a new user and updates their *Trilho* with the appropriate next step.

| Field                       | Type   | Required    | Options / Notes                                                                  |
| --------------------------- | ------ | ----------- | -------------------------------------------------------------------------------- |
| `full_name`                 | string | yes         | Nome e sobrenome                                                                 |
| `phone`                     | string | yes         | Fone/WhatsApp                                                                    |
| `decision_type`             | enum   | yes         | `primeira_vez`, `reconciliacao`                                                  |
| `how_met_church`            | enum   | yes         | `convite_amigo`, `convite_parente`, `redes_sociais`, `passou_em_frente`, `outro` |
| `how_met_church_other`      | string | conditional | required if `outro`                                                              |
| `gender`                    | enum   | yes         | `feminino`, `masculino`                                                          |
| `age`                       | int    | yes         | Idade (not birth date)                                                           |
| `civil_state`               | enum   | yes         | `solteiro`, `casado`, `divorciado`, `viuvo`                                      |
| `street`                    | string | yes         | Rua / N°                                                                         |
| `neighborhood`              | string | yes         | Bairro                                                                           |
| `city`                      | string | yes         | Cidade                                                                           |
| `culto_attendance`          | enum   | yes         | `primeira_vez`, `segunda_vez`, `terceira_vez`, `mais_de_um_mes`                  |
| `life_group_status`         | enum   | yes         | `sim`, `nao`, `ja_foi_convidado`                                                 |
| `life_group_leader_name`    | string | conditional | required if `sim` — "Qual o nome do líder"                                       |
| `invited_by`                | string | yes         | Quem te convidou                                                                 |
| `notes`                     | text   | no          | Alguma observação                                                                |

**Side effects on submit**

- Match or create `User`
- Update *Trilho do Membro* (e.g., add Nova Criatura step if first decision)
- Notify life group leader / sector leader for follow-up

| Role              | Can write | Can read own | Can read all in scope |
| ----------------- | --------- | ------------ | --------------------- |
| admin             | ✅         | ✅            | ✅                     |
| pastor            | ✅         | ✅            | ✅                     |
| area_leader       | ✅         | ✅            | ✅                     |
| sector_leader     | ✅         | ✅            | ❌                     |
| life_group_leader | ✅         | ✅            | ❌                     |
| member            | ❌         | —            | —                     |

---

### 3.3. Relatório de Life Group (semanal)

Filled by the life group leader after each weekly meeting. `area`, `sector`, and `life_group` are inferred from the leader's profile. If not yet attached, admin must attach them first.

| Field                           | Type          | Required    | Notes                                                                                     |
| ------------------------------- | ------------- | ----------- | ----------------------------------------------------------------------------------------- |
| `date`                          | date          | yes         | defaults to today                                                                         |
| `area_id`                       | uuid          | yes         | auto from leader                                                                          |
| `sector_id`                     | uuid          | yes         | auto from leader                                                                          |
| `life_group_id`                 | uuid          | yes         | auto from leader                                                                          |
| `committed_members`             | int           | yes         | Membros Compromissados                                                                    |
| `committed_members_present`     | int           | yes         | Membros Compromissados PRESENTES                                                          |
| `kids_0_to_11`                  | int           | yes         | Crianças de 0 a 11 anos                                                                   |
| `guests`                        | int           | yes         | Convidados                                                                                |
| `mdas`                          | int           | yes         | MDA's                                                                                     |
| `offering`                      | decimal(10,2) | yes         | 0,00 if none                                                                              |
| `committed_at_tadel`            | int           | yes         | Quantos membros comprometidos presentes no TADEL                                          |
| `committed_at_culto`            | int           | yes         | Quantos membros comprometidos presentes no CULTO                                          |
| `leader_attended`               | string[]      | yes         | multi-checkbox: `culto`, `tadel`, `oracao_antes_culto`                                    |
| `disciples_count`               | int           | yes         | Quantos discípulos você tem                                                               |
| `disciples_discipled_this_week` | int           | yes         | Quantos você discipulou esta semana                                                       |
| `pastoring_activity_type`       | string[]      | yes         | multi-checkbox: `nao_realizei`, `enfermidade`, `aconselhamento`, `encorajamento`, `consolidacao`, `outro` |
| `pastoring_activity_other`      | string        | conditional | required if `outro` selected; "NÃO USE VÍRGULA NA RESPOSTA"                              |
| `training_activity_type`        | string[]      | yes         | multi-checkbox: `nao_realizei`, `outro`                                                   |
| `training_activity_other`       | string        | conditional | required if `outro` selected; "NÃO USE VÍRGULA NA RESPOSTA"                              |

| Role              | Can write | Visibility                          |
| ----------------- | --------- | ----------------------------------- |
| admin             | ✅         | all submissions                     |
| pastor            | ✅         | all submissions                     |
| area_leader       | ✅         | all life groups inside their area   |
| sector_leader     | ✅         | all life groups inside their sector |
| life_group_leader | ✅         | only their own life group           |
| member            | ❌         | —                                   |

---

### 3.4. Atividades Supervisor de Setor (semanal)

Weekly report of a sector supervisor's pastoral activity over the life groups in their sector.

| Field                      | Type     | Required | Notes                                                                                                               |
| -------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `date`                     | date     | yes      |                                                                                                                     |
| `sector_id`                | uuid     | yes      | auto from supervisor                                                                                                |
| `sector_multiplication_date` | date   | no       | Data de multiplicação do setor                                                                                      |
| `life_groups_count`        | int      | yes      | Quantos Life Groups você tem                                                                                        |
| `life_groups_supervised`   | int      | yes      | Quantos Life Groups você supervisionou                                                                              |
| `life_group_observations`  | string[] | no       | multi-checkbox observations: `tempo`, `momento_discontracao`, `palavra`, `louvor`, `visao`, `atmosfera`, `oferta`, `ambiente` |

| Role              | Can write | Visibility                              |
| ----------------- | --------- | --------------------------------------- |
| admin             | ✅         | all                                     |
| pastor            | ✅         | all                                     |
| area_leader       | ❌         | all sectors inside their area (read)    |
| sector_leader     | ✅         | their own submissions                   |
| life_group_leader | ❌         | —                                       |
| member            | ❌         | —                                       |

---

### 3.5. Atividades Supervisor de Área (semanal)

Weekly report of an area supervisor's activity across the sectors in their area.

| Field                     | Type     | Required | Notes                                                                                                               |
| ------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `date`                    | date     | yes      |                                                                                                                     |
| `area_id`                 | uuid     | yes      | auto from supervisor                                                                                                |
| `life_groups_count`       | int      | yes      | Quantos Life Groups você tem                                                                                        |
| `life_groups_supervised`  | int      | yes      | Quantos Life Groups você supervisionou                                                                              |
| `life_group_observations` | string[] | no       | multi-checkbox observations: `tempo`, `momento_discontracao`, `palavra`, `louvor`, `visao`, `atmosfera`, `oferta`, `ambiente` |

| Role              | Can write | Visibility                 |
| ----------------- | --------- | -------------------------- |
| admin             | ✅         | all                        |
| pastor            | ✅         | all                        |
| area_leader       | ✅         | only their own submissions |
| sector_leader     | ❌         | —                          |
| life_group_leader | ❌         | —                          |

---

### 3.6. Formulário de Multiplicação

Submitted by an `area_leader` together with the new leader ("Deve ser preenchido pelo supervisor junto com o próximo líder"). On submit (no approval workflow), the system **creates a new life group** in a single DB transaction and links the new leader.

**New leader qualification fields (first page):**

| Field                            | Type   | Required    | Notes                                                      |
| -------------------------------- | ------ | ----------- | ---------------------------------------------------------- |
| `date`                           | date   | yes         | Data da multiplicação                                      |
| `completed_leadership_track`     | enum   | yes         | Completou o trilho de liderança? (yes/no dropdown)         |
| `legally_married`                | enum   | no          | É casado legalmente? (civil e religioso) (dropdown)        |
| `faithful_tither`                | enum   | yes         | É dizimista e ofertante fiel? (fiel todos os meses / fiel de tudo / não administra) |
| `evangelizing_and_consolidating` | enum   | yes         | Está evangelizando e consolidando? (dropdown)              |
| `good_testimony`                 | enum   | yes         | Dá bom testemunho? (dropdown)                              |
| `single_living_in_purity`        | enum   | conditional | Se solteiro está vivendo uma vida de pureza moral? (dropdown) |
| `area`                           | string | yes         | Área (free text)                                           |
| `sector`                         | string | yes         | Setor (free text)                                          |

**Life Group 1 — NOVO Life Group (que está saindo):**

| Field                    | Type   | Required | Notes                         |
| ------------------------ | ------ | -------- | ----------------------------- |
| `new_lg_name`            | string | yes      | Nome do Life Group            |
| `new_lg_leader`          | string | yes      | Líder (name)                  |
| `new_lg_host`            | string | yes      | Anfitrião                     |
| `new_lg_address`         | string | yes      | Endereço                      |
| `new_lg_leader_phone`    | string | yes      | Telefone do Líder             |
| `new_lg_meeting_day_time`| string | yes      | Dia e Hora                    |
| `new_lg_members`         | string[] | no     | 1-Membro(a), 2-Membro(a), ... |

**Life Group 2 — ANTIGO Life Group (que multiplicou):**

| Field                    | Type   | Required | Notes                         |
| ------------------------ | ------ | -------- | ----------------------------- |
| `old_lg_name`            | string | yes      | Nome do Life Group            |
| `old_lg_leader`          | string | yes      | Líder (name)                  |
| `old_lg_host`            | string | yes      | Anfitrião                     |
| `old_lg_address`         | string | yes      | Endereço                      |
| `old_lg_leader_phone`    | string | yes      | Telefone do Líder             |
| `old_lg_meeting_day_time`| string | yes      | Dia e Hora                    |
| `old_lg_members`         | string[] | no     | 1-Membro(a), 2-Membro(a), ... |

**Side effects on submit (transactional)**

- Create new `LifeGroup` with new leader, host, address, day/time
- Update old life group record (members, host, etc.)
- Append audit log entry

| Role              | Can write | Visibility                 |
| ----------------- | --------- | -------------------------- |
| admin             | ✅         | all                        |
| pastor            | ✅         | all                        |
| area_leader       | ✅         | only their own submissions |
| sector_leader     | ❌         | —                          |
| life_group_leader | ❌         | —                          |

---

### 3.7. Relatório do Culto (ATM — Atmosfera)

Filled by an Atmosfera team leader after each service. Replaces the previous generic service report. The team is selected from the `atmosphere_teams` table (managed by admins).

**Section 1 — Identificação**

| Field                        | Type   | Required    | Notes                                                               |
| ---------------------------- | ------ | ----------- | ------------------------------------------------------------------- |
| `date`                       | date   | yes         |                                                                     |
| `report_type`                | enum   | yes         | `tadel`, `culto_celebracao`, `evento`                               |
| `period`                     | enum   | yes         | `manha`, `tarde_noite`                                              |
| `atmosphere_team_id`         | int    | conditional | FK to `atmosphere_teams`; null if `atmosphere_team_other` filled    |
| `atmosphere_team_other`      | string | conditional | free text when team not in list                                     |
| `atmosphere_responsible`     | string | yes         | "Responsável pela equipe Atmosfera no dia"                          |

**Section 2 — Contabilização de pessoas Tadel**

| Field          | Type | Required | Notes   |
| -------------- | ---- | -------- | ------- |
| `tadel_adults` | int  | yes      | Adultos |
| `tadel_kids`   | int  | no       | Crianças |

**Section 3 — Contabilização de veículos**

| Field              | Type   | Required | Notes                                     |
| ------------------ | ------ | -------- | ----------------------------------------- |
| `vehicles_cars`    | int    | yes      | Carros                                    |
| `vehicles_motos`   | int    | no       | Motos                                     |
| `vehicles_bikes`   | int    | no       | Bicicletas                                |
| `vehicles_others`  | string | no       | Outros (free text, ex: "Ônibus - 2")      |

**Section 4 — Contabilização de voluntários**

| Field                    | Type | Required | Notes      |
| ------------------------ | ---- | -------- | ---------- |
| `volunteers_atmosfera`   | int  | no       | Atmosfera  |
| `volunteers_louvor`      | int  | no       | Louvor     |
| `volunteers_midia`       | int  | no       | Mídia (transmissão ao vivo, vídeos, fotos) |
| `volunteers_danca`       | int  | no       | Dança      |

**Section 5 — Informações gerais**

| Field   | Type | Required | Notes                                                    |
| ------- | ---- | -------- | -------------------------------------------------------- |
| `notes` | text | no       | Observação sobre ocorrências, materiais faltando, danos |

| Role                        | Can write | Visibility |
| --------------------------- | --------- | ---------- |
| admin                       | ✅         | all        |
| pastor                      | ✅         | all        |
| atmosphere_ministry_leader  | ✅         | all their ministry teams |
| atmosphere_team_leader      | ✅         | their own  |

---

### 3.8. Convidado

Quick form to register a guest (filled by a leader on the mobile app — "Página convidado").

| Field            | Type   | Required | Notes                                           |
| ---------------- | ------ | -------- | ----------------------------------------------- |
| `full_name`      | string | yes      | Nome                                            |
| `phone`          | string | no       | WhatsApp                                        |
| `address`        | string | no       | Endereço                                        |
| `how_met_church` | string | no       | "Quem te convidou ou como conheceu a igreja" (free text) |
| `filled_by`          | string  | no       | Quem preencheu                                  |
| `notes`              | text    | no       | Observação                                      |
| `via_casa_de_paz`    | boolean | no       | checkbox — convidado veio de uma Casa de Paz    |

**Side effects on submit**

- Create `Guest` record
- Notify the inviter's leader for follow-up

| Role              | Can write | Visibility   |
| ----------------- | --------- | ------------ |
| admin             | ✅         | all          |
| pastor            | ✅         | all          |
| area_leader       | ✅         | their area   |
| sector_leader     | ✅         | their sector |
| life_group_leader | ✅         | their own    |
| member            | ❌         | —            |

---

## 4. Cross-cutting Requirements

### 4.1. `forms-core` shared module (backend)

A NestJS module that hosts:

- **`ScopeGuard`** — resolves the requesting user's scope from JWT (`area_leader` → list of sector_ids and life_group_ids; `sector_leader` → life_group_ids; `life_group_leader` → their single life_group_id; `admin`/`pastor` → unrestricted). Applied as `WHERE` clause on every form query.
- **`FormSubmissionPolicy`** — enforces edit/delete rules (24h window for submitter, admin always, soft-delete via `deleted_at`).
- **`FormSubmissionAuditLog` entity** — `id`, `form_slug`, `submission_id`, `actor_id`, `action` (`create | update | delete`), `diff` (jsonb), `created_at`. Written by every form's service on mutation.
- **`NotificationSender` interface** — `sendEmail(to, template, data)` and `sendWhatsApp(...)` methods. Email impl uses Resend SDK; WhatsApp impl is a `NoopSender` for v1.
- **`ChurchSettingsService`** — exposes `getContactEmail()` reading from the existing Igreja settings table; falls back to `process.env.DEFAULT_FROM_EMAIL` (default `contato@igrejapaz.com.br`).

### 4.2. Course → Form linking

- **`courses` table**: `id`, `name`, `description?`, `is_active`, `created_at`, `updated_at`.
- **`form_course_links` table**: `form_slug`, `course_id`, `display_order`, primary key (`form_slug`, `course_id`).
- For v1 only `member-registrations` uses this. Same mechanism is reusable for any future form.
- Courses are managed **inside the admin Cadastro do Membro page** (admin role only) — no separate Cursos sidebar entry.

**Seed list** (initial courses, all active):

- Acompanhamento Inicial Nível 1
- Acompanhamento Inicial Nível 2
- Nova Criatura
- Estação DNA
- Expresso 1
- Expresso 2
- Café com Pastor
- É Batizado
- Encontro com Deus

### 4.3. Pre-fill on first login

- After Cadastro do Membro submit, a `pending_user` record is created keyed by email/phone.
- On Firebase login (`POST /api/auth/social-login`), backend matches by email; if `pending_user` exists, profile is merged and user is activated.

### 4.4. Onboarding notifications

- **Email (v1)** — Resend transactional API. HTML template with App Store / Play Store links and welcome message. Sent asynchronously via job queue (BullMQ). Track delivery status; retry on failure.
- **WhatsApp (v2)** — provider TBD; abstracted behind `NotificationSender.sendWhatsApp`.
- **Sender address** — pulled from church Configurações → contact email; env fallback.

### 4.5. Trilho do Membro (member path)

- Each member has a `member_path` row with steps: `nova_criatura`, `acompanhamento_1`, `acompanhamento_2`, `estacao_dna`, `expresso_1`, `expresso_2`, `cafe_com_pastor`, `batismo`, `encontro_com_deus`.
- Cadastro do Membro and Conversão forms write into this path.

### 4.6. Edit / delete policy

- Submitter can edit their own submission within **24 hours** of creation.
- `admin` can edit or soft-delete any submission at any time.
- Hard-delete never; deleted rows keep `deleted_at` and are excluded from default queries.
- Every mutation is recorded in `form_submission_audit_log`.

---

## 5. API Surface

All endpoints under `/api`, JSON `snake_case`.

| Method | Path | Purpose |
|--------|------|---------|
| `GET`    | `/forms`                            | Catalog: 8 forms with permissions resolved for current user (drives admin hub + mobile list) |
| `GET`    | `/forms/:slug`                      | List submissions (cascade-scoped, filterable) |
| `POST`   | `/forms/:slug`                      | Create submission |
| `GET`    | `/forms/:slug/:id`                  | Detail |
| `PATCH`  | `/forms/:slug/:id`                  | Edit (24h window or admin) |
| `DELETE` | `/forms/:slug/:id`                  | Soft-delete (admin only) |
| `GET`    | `/forms/member-registrations/courses` | Linked courses list (used by both web and mobile) |
| `POST`   | `/forms/member-registrations/courses` | Admin: create course + link to form |
| `PATCH`  | `/courses/:id`                      | Admin: edit course |
| `DELETE` | `/forms/member-registrations/courses/:id` | Admin: unlink course from this form |

**Slugs:** `member-registrations`, `conversions`, `life-group-reports`, `sector-supervisor-reports`, `area-supervisor-reports`, `multiplications`, `service-reports`, `guests`.

---

## 6. Admin UI

- **Sidebar** gains one entry: **Formulários**.
- **Hub page** `/formularios` — cards for each form, role-filtered. Each card shows icon, name, short description, and submission count visible to the user.
- **Form page** `/formularios/[slug]`:
  1. Header — form name + "+ Novo registro" button (if user can write).
  2. Admin config panel — **Cadastro do Membro only**, admin role only: "Cursos disponíveis neste formulário" with reorder, edit, remove, and inline "+ Adicionar curso".
  3. Submissions list — table with filters (date range, area, sector, life group, leader). Columns vary per form. Row click → detail.
- **Detail page** `/formularios/[slug]/[id]` — read-only field render, audit log section, edit/delete buttons gated by policy.
- Reuses existing admin-ui components (table, filter chips, role-aware fetcher). Backend scope guard keeps frontend free of cascade logic.

---

## 7. Mobile App

- **Entry point**: new `Formulários` tile under the existing `Conta` screen.
- **Formulários list screen**: cards per form the user can write (filtered via `GET /api/forms`). Each card shows form name, description, badge with count of user's own submissions.
- **Form drilldown screen** `/formularios/[slug]` — two top tabs:
  - **Novo** — Flutter form (GetX state), validation matching backend DTOs, "Salvar" submits.
  - **Histórico** — chronological list of user's own submissions; tap → read-only detail; "Editar" if within 24h.
- **Form rendering** — per-form Flutter widgets (no generic renderer for v1); shared form components for date pickers, multi-selects, and area/sector/life dropdowns auto-populated from leader profile.
- **No offline drafts in v1.**

---

## 8. Implementation Plan

### Phase 1 — Backend foundations
1. **`forms-core`** module: `ScopeGuard`, `FormSubmissionPolicy`, `FormSubmissionAuditLog` entity, `NotificationSender` interface, `ChurchSettingsService`, Resend email impl, BullMQ queue.
2. **Schema migrations**: 8 form tables + `courses` + `form_course_links` + `form_submission_audit_log` + `member_path` (or extension of `users`).
3. **Per-form modules** (one at a time): entity, DTO (class-validator), controller, service.
4. **Side-effect services**: `OnboardingService`, `ConversionMatchService`, `MultiplicationService` (transactional), `MemberPathService`.
5. **Catalog endpoint** `GET /api/forms` with per-user permissions.
6. **Seeds**: courses list, default `form_course_links` for Cadastro do Membro.
7. **Tests** — unit per service, integration for scope guard and multiplication transaction.

### Phase 2 — Admin UI
1. New sidebar entry **Formulários** + hub page with role-filtered cards.
2. Generic list view component with per-form column config + filter chips.
3. Per-form detail view (read-only render of all fields + audit log).
4. **Cadastro do Membro** admin config panel (courses manager) with inline create/edit/remove/reorder.
5. Edit/delete UI gated by policy response from backend.

### Phase 3 — Mobile App
1. Add **Formulários** tile under **Conta**.
2. List screen consuming `GET /api/forms`.
3. Per-form drilldown screen with `Novo` + `Histórico` tabs.
4. Per-form Flutter widgets + validation matching DTOs.
5. Edit flow for submissions still within 24h.

### Phase 4 — Notifications & polish
1. Resend email templates wired and tested in staging (sender resolved from church settings).
2. Onboarding flow E2E tested (Cadastro → email → app install → social login auto-fill).
3. Audit log surfacing for sensitive forms (multiplication, member registration changes).
4. WhatsApp provider deferred to v2.

---

## 9. Out of Scope (v1)

- WhatsApp onboarding (deferred to v2, interface ready).
- Multiplication approval workflow.
- Form schema versioning machinery.
- Mobile offline drafts.
- Generic dynamic form renderer (each form is hand-built).
- Members filling Convidado from the mobile app.
