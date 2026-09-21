# Org chart canvas view — design

## Context

The org chart feature (PR #59, merged) added `GET /areas/org-chart` and a collapsible list-tree (`admin-ui/components/organization/org-chart-tree.tsx`) rendered inside the "Hierarquia" tab of `/organizacao`. The user wants a more visual, interactive representation: a real node-link org chart diagram, on its own full page, in addition to the existing list-tree (not replacing it).

## Goals

- A pannable/zoomable canvas org chart: pastor(s) at the top, branching down through areas → sectors → life groups, connected by lines.
- Clicking a node opens the same details/edit experience users already have (leader/co-leader info, parent/children, re-parent via "Mover para…" select).
- Lives on its own full-page route, separate from the tabbed `/organizacao` page.
- The existing list-tree in the Hierarquia tab stays exactly as-is — this is additive, not a replacement.

## Non-goals

- No drag-and-drop re-parenting on the canvas (confirmed with user: re-parenting stays a click → side panel → select flow, same as today).
- No backend changes. `GET /areas/org-chart` and all existing re-parent/validation endpoints are reused unchanged.
- No changes to the existing list-tree component or the Hierarquia tab.

## Architecture

**New route:** `admin-ui/app/(dashboard)/organizacao/organograma/page.tsx` — full-page canvas view.

**Library:** `@xyflow/react` (React Flow v12) for the canvas primitives (pan/zoom, custom nodes, edges, `Controls`, `MiniMap`). `dagre` for automatic top-down tree layout — the org chart's node count/depth is data-driven (varies by how many areas/sectors/life groups exist), so hand-placing coordinates isn't viable; dagre computes a layered layout from the node/edge list.

Both are new dependencies for `admin-ui` — no existing diagram/graph library is present in `package.json` today.

**Data flow:** reuses `useOrgChart()` (`admin-ui/lib/hooks/use-areas.ts`) — the same hook the list-tree uses. The canvas page transforms the `OrgChart` response (`roots[]`, `unassigned_areas[]`, `unassigned_sectors[]`, `unassigned_life_groups[]`) into React Flow `nodes[]`/`edges[]`, then runs dagre layout to assign positions.

**Node rendering:** a custom React Flow node component styled with existing shadcn/PazColors tokens — matches the visual language already established in `org-chart-tree.tsx` (role badge, name, child count), not React Flow's default node box.

**Unassigned clusters:** areas/sectors/life groups with no parent render as a visually separate, clearly labeled cluster on the canvas (e.g. positioned to the side, with a section label), preserving the "nothing is hidden" guarantee from the original feature's review pass.

**Interaction:**
- Click a node → opens the same details `Sheet` already used by the list-tree (leader/co-leader, parent, children, links to `/areas`/`/sectors`/`/life-groups`), including the "Mover para…" re-parent `Select` and the existing confirm-before-destroy dialog for detach actions.
- Pan, zoom, fit-view via React Flow's built-in `Controls`; `MiniMap` for orientation on larger trees.
- Canvas itself is read-only for structure (no dragging nodes to re-parent) — all mutations go through the side panel, identical semantics to the list-tree today.

## Components

New:
- `admin-ui/app/(dashboard)/organizacao/organograma/page.tsx` — page shell, breadcrumb/back link to `/organizacao`.
- `admin-ui/components/organization/org-chart-canvas.tsx` — React Flow wrapper: builds nodes/edges from `OrgChart`, runs dagre layout, renders `ReactFlow` with `Controls`/`MiniMap`/`Background`.
- `admin-ui/components/organization/org-chart-canvas-node.tsx` — custom node component (role badge, name, child count, click handler).

Reused, not duplicated — extract into shared exports if currently private to `org-chart-tree.tsx`:
- Details `Sheet` content/logic.
- `MoveSelect` component and its mutation wiring (`useUpdateArea`/`useUpdateSector`/`useUpdateLifeGroup`).
- Confirm-before-destroy `AlertDialog` for detach actions.

Modified:
- `admin-ui/app/(dashboard)/organizacao/organizacao-management.tsx` — add a link/button ("Ver organograma visual" or similar) from the Hierarquia tab (or page header) to `/organizacao/organograma`. No structural change to the existing tab content.
- `admin-ui/components/sidebar.tsx` — optionally add a direct nav entry, or keep discovery via the link above (implementation detail, low-risk either way).

## Error handling / edge cases

- Empty org chart (no roots, no unassigned buckets): canvas shows the same empty-state messaging pattern as the list-tree, not a blank canvas.
- Large trees: dagre layout handles arbitrary depth/width; `MiniMap` + zoom controls keep large charts navigable. No pagination/virtualization needed at current data scale (a handful of areas/sectors/life groups).
- Loading/error states: mirror the existing `useOrgChart()` loading/error handling already implemented for the list-tree.

## Testing

- No test runner configured for `admin-ui` today (confirmed in the original feature's validation) — validation is `tsc --noEmit` + scoped `eslint` + manual walkthrough, same as before.
- Manual walkthrough: load `/organizacao/organograma`, confirm pastor root + areas/sectors/life groups render with correct connecting lines, confirm unassigned clusters appear, click a node → details sheet opens, re-parent via select → canvas reflects the change after refetch, pan/zoom/fit-view work.

## Change checklist

- Update `.ai/features/` org/hierarchy documentation to mention the new canvas view alongside the list-tree.
