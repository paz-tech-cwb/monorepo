# Spec: Reminders v2 (phase 2 of the attendance + report merge)

Stacked on PR #96 (`feat/life-group-meetings-api`, backend meetings API, draft). Branch `feat/life-group-reminders-v2`; PR base is `feat/life-group-meetings-api` (retarget to develop once #96 merges).
Source design: `.pipeline/design-attendance-report-merge.md` section 5.3 (reminders) and 5.8 (flags).

## Goal
Consolidate the leader reminders around ONE rule (`life_group_attendance`): new combined copy, a daily follow-up when attendance exists but the report is missing, and an escalation to the sector leader (+ co-leader) at day 5. Everything new is behind the server flag `LIFE_GROUP_MEETING_V2` (default OFF); with the flag off the behavior is identical to today.

## Product decisions (user)
- Q4: report stays required in practice. Keep asking the leader; if there is still no report 5 days after the meeting, notify the SECTOR leader and sector co-leader (not covered by the per-category toggle (user-level global opt-outs still suppress), dedupe per group + meeting date).
- Q6: follow-up push at 09:00 America/Sao_Paulo the next morning for groups with attendance but no report. Default "keep asking": repeats DAILY at 09:00 until the report exists or day 5, when the escalation fires and daily reminders stop. Configurable: `followup_hour: 9`, `followup_interval_days: 1`, `followup_max_days: 5` (cap), `escalation_after_days: 5`. FLAGGED DEFAULT.
- Q7: groups without a fixed day (or null meeting_time) are skipped by reminders. Manual date entry ("Nova reunião") is a Phase 3 mobile concern; verify meetings API weekday validation.
- Q10: all groups get the new copy, but the combined screen does not exist in apps yet (old apps open the old attendance editor via `paz://presenca/{id}/{date}`). New copy, follow-up and escalation stay behind `LIFE_GROUP_MEETING_V2`, default OFF. The `form_report` life-group-reports entry is NOT touched in this PR (removal is a separate later cutover migration).
- Unchanged from the design: reuse `paz://presenca/{lifeGroupId}/{date}`, category `life_group_attendance` (per-category toggle bypassed, user-level global opt-outs still apply; channel `paz_life_group`), reminders in Sao Paulo time, recipients leader + co-leader (dedupe; co-leader even with role member).

## Design decisions made in this phase
1. Escalation category: reuse `life_group_attendance` (absent from CATEGORY_PREF_MAP so the per-category toggle is bypassed; global allNotificationsEnabled/pushEnabled opt-outs still apply, mapped to `paz_life_group`, not in CATEGORY_PREF_MAP, not parsed by any client). No enum migration, no client change.
2. Escalation deep link: `paz://lifegroup/{lifeGroupId}`, already parsed on Android (`life_group_detail/{id}`) and iOS. No new scheme. (`paz://presenca/...` would open the leader attendance editor, not an oversight view.)
3. Flag read at runtime through `isLifeGroupMeetingV2Enabled()` (env `LIFE_GROUP_MEETING_V2` = `true`/`1`), evaluated every tick, so no code path changes with it off.
4. Claim-first dispatch (insert `reminder_dispatch_log` first, delete on send failure) is used for the primary push only under the flag; the legacy path stays check-then-send-then-insert verbatim because changing it could alter old behavior (e.g. a failed send is no longer retried). The claim key is the same as the legacy key (`life_group_attendance:{gid}:{date}`), so toggling the flag never re-sends an already-sent push.
5. Report detection ("has a report"): a non-deleted `life_group_reports` row for the group that is linked via `attendance_id` OR dated within [meeting_date, meeting_date + 6] (legacy reports are not linked and may be dated the Sunday after the meeting).
6. Escalation only when attendance exists and the report is missing (a meeting with no attendance is not proven to have happened; the primary push covers that). Flagged as a product question.
7. Follow-up days: for day k = 1..followup_max_days and k < escalation_after_days (when escalation is enabled) with (k-1) % followup_interval_days == 0; escalation on day k == escalation_after_days. `followup_max_days: 0` disables follow-ups; `escalation_after_days: 0` disables escalation. All at `followup_hour` Sao Paulo.
8. New config fields keep defaults for rows saved before (resolver merges DEFAULT_CONFIGS), so no data migration is needed. Legacy `title`/`message` stay for the old copy; the new copy lives in `meeting_title`/`meeting_message`.

## Scope
Backend: `reminders/types/reminder-config.ts` (types, defaults, validation, resolver), new `life-group-meeting-v2.flag.ts`, claim helper, `life-group-attendance-reminder.evaluator.ts` (flag branch), `reminders.module.ts` (entities), specs. Admin-ui: `reminder-settings.tsx`, `lib/api/types/reminder-rules.ts`. Docs: `.ai` features/apps, `.pipeline`.
Out of scope: Phase 3 mobile, form_report entry removal, per-group pilot allowlist, unrelated form_report timezone fix.

## Meetings API weekday validation (Q7, verified in code)
`LifeGroupAttendanceService.assertMatchesMeetingDay` returns early when the group has no fixed weekday, so any past date is accepted for groups without a fixed day (D3 holds). For groups WITH a fixed day, a new meeting on another weekday is rejected (400). Extra meetings on a different weekday for fixed-day groups are therefore a gap; relaxing it is not clearly safe (the rule protects against typos/wrong-day roster snapshots and feeds task eligibility), so it is reported, not changed.

## Tests (jest fake timers)
Follow-up at 09:00 SP next morning (not before, not twice); daily cap and stop at day 5; day-5 escalation recipients (sector leader + co-leader, none without a leader, group without sector, dedupe per group+date); concurrent runs claim-first -> one push; midnight rollover and UTC vs SP; co-leader recipients; no fixed day / null meeting_time skipped; report exists -> no follow-up/escalation; attendance missing -> only primary logic; flag off -> legacy spec unchanged and green. Config validation tests. Admin-ui tsc/eslint/build. Real-SQL check against throwaway embedded Postgres.

## User decisions round 2 (reminders v2) - 2026-10-13 (supersede the Q6 timing and design decision 7 above)
1. Q6 daily cadence CONFIRMED; Q4 escalation without attendance: keep as is (the primary push covers it); escalation deep link `paz://lifegroup/{id}` CONFIRMED; opt-outs unchanged.
2. NEW TIMING (replaces "09:00 next morning"): leader AND co-leader are reminded 24h after the meeting datetime (meeting date + `meeting_time`, hour AND minutes, America/Sao_Paulo), then every 24h (+48h, +72h, +96h); the sector leader (and co-leader) is notified at +5 days (+120h). Hourly-tick tolerance: a due time is honored by any tick in [due, due + 2h] (a 21:30 due is sent at 22:00); claim keys dedupe. Config: `followup_first_after_hours` (24), `followup_interval_hours` (24), `followup_max_days` (5, cap; 0 = off), `followup_window_hours` (2), `escalation_after_days` (5; 0 = off). Old keys: `followup_hour` ignored, `followup_interval_days` fallback (x24h) when the new key is absent; both still accepted on save. Flag stays default OFF; flag off = legacy.
3. A co-leader's report completes the reminder: "has a report" is group-based (any author), confirmed and tested for leader<->co-leader. Extras (`is_extra`) with attendance are followed up/escalated like any meeting using the attendance row's date + the group's `meeting_time`; reminders are never created for extras; the primary-push check filters `is_extra = false`. Groups without a fixed day or `meeting_time` stay skipped (no meeting instant), including extras of such groups.
