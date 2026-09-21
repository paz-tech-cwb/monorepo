# Feature: Admin Dashboard

## Purpose

The staff-facing web dashboard for operating the church platform.

## Responsibilities

- Authenticate staff/admin users.
- Present role-appropriate navigation and data.
- Manage people, members, users, life groups, forms, notifications, ministries, and configuration.
- Consume backend API contracts directly.

## API expectations

- API base URL comes from environment configuration.
- Backend JSON is `snake_case` on the wire.
- Do not silently convert the entire API contract to camelCase without an architecture decision.

## UI expectations

- Preserve existing design system/component conventions in admin-ui.
- Avoid hardcoding domain enums when the backend can provide them.
- When hardcoded options remain, document them in `feature-map.md` as WIP.

## Organization hierarchy views

Both views consume `GET /areas/org-chart` via `useOrgChart()` (`admin-ui/lib/hooks/use-areas.ts`) and share reparent/detach mutation logic via `useOrgChartMoves()` (`admin-ui/components/organization/org-chart-shared.tsx`).

- **List-tree** (`admin-ui/components/organization/org-chart-tree.tsx`) — collapsible tree rendered in the "Hierarquia" tab of `/organizacao`. Reparent areas/sectors/life groups via inline `Select` ("Mover para…"), with a confirm dialog before detaching (setting parent to none).
- **Canvas** (`admin-ui/components/organization/org-chart-canvas.tsx`, route `/organizacao/organograma`) — a pannable/zoomable node-link diagram built with `@xyflow/react` (React Flow) and `@dagrejs/dagre` for automatic top-down layout. Pure graph construction lives in `admin-ui/lib/org-chart/build-graph.ts` (no React). Clicking a node opens the same details `Sheet`/reparent `Select`/detach dialog as the list-tree. Structure mutations are click → sheet → select only — no drag-to-reparent on the canvas. Unassigned areas/sectors/life groups render as labeled dashed cluster nodes so nothing is hidden from the diagram.
- Reachable from `/organizacao` via the "Ver organograma visual" button and from the sidebar "Organograma" nav entry.
