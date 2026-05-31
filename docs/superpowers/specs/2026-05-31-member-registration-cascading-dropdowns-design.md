# Member Registration — Cascading Sector / Life Group / Leader Dropdowns

**Date:** 2026-05-31
**Scope:** Backend (minor), Admin UI, Mobile App

## Problem

The "Novo Registro de Membro" form on both Admin and Mobile currently asks the user to type raw IDs for sector, life group, and leader. This is error-prone and offers no guidance about which life groups belong to which sector, or who leads each group.

## Goal

Replace the raw ID inputs with smart, cascading dropdowns:

1. **Sector** — pick from a list of all sectors (alphabetical)
2. **Life Group** — filtered to only the life groups in the selected sector (alphabetical)
3. **Leader** — pre-filled from the selected life group's leader; overridable from a list of all known leaders (alphabetical)

Selecting a life group auto-sets the sector and pre-fills the leader. The user can still override the leader independently.

## Approach

Client-side cascade (Approach A). All sectors and life groups are loaded once on form mount and filtered in-memory. No new backend endpoints are needed. The only backend change is adding `leader_name` to the existing `GET /api/life-groups` response.

## Backend

**File:** `backend/src/life-groups/life-groups.service.ts` — `toResponse()`

Add one field:
```ts
leader_name: lifeGroup.leader?.name ?? null,
```

No migration. No new endpoint. No DTO changes. The `leader` relation is already loaded.

**Updated response shape:**
```json
{
  "id": 3,
  "name": "GL Portão",
  "sector_id": 2,
  "leader_id": 7,
  "leader_name": "João Silva",
  ...
}
```

## Admin UI (`admin-ui/app/(dashboard)/members/new/member-registration-form.tsx`)

### Data loading
- `useSectors()` — already used, loads all sectors
- `useLifeGroups()` — already used, loads all life groups (now includes `leader_name`)

### State
```ts
const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null)
const [selectedLifeGroupId, setSelectedLifeGroupId] = useState<number | null>(null)
const [selectedLeaderName, setSelectedLeaderName] = useState<string | null>(null)
```

### Derived data (computed, not state)
```ts
const filteredLifeGroups = lifeGroups
  .filter(lg => lg.sector_id === selectedSectorId)
  .sort((a, b) => a.name.localeCompare(b.name))

const allLeaders = Array.from(
  new Map(
    lifeGroups
      .filter(lg => lg.leader_id != null)
      .map(lg => [lg.leader_id, lg.leader_name])
  ).entries()
).map(([id, name]) => ({ id, name }))
 .sort((a, b) => a.name.localeCompare(b.name))
```

### Cascade logic
| User action | Effect |
|---|---|
| Select sector | Clear life group + leader; filter LG list |
| Select life group | Set sector (if not set); pre-fill leader from LG's `leader_name` |
| Select leader manually | Override leader only; no other cascade |

### Form schema changes
- `sector_id: z.number()` — unchanged
- `life_group_ids: z.array(z.number()).min(1)` — unchanged
- `leader_name: z.string().optional()` — changes from free-text `<Input>` to `<Select>` sourced from `allLeaders`

### Alphabetical ordering
All three dropdowns sort by name. Sectors and life groups are already returned alphabetically from the API; client also sorts after filtering to guarantee order.

## Mobile App (`mobile-app/lib/features/formularios/forms/member_registration_form.dart`)

### Data loading
Add to `FormulariosService`:
```dart
Future<List<Map<String, dynamic>>?> loadSectors() async {
  return _net.requestList<Map<String, dynamic>>(
    ApiEndpoint.sectors, fromJson: (j) => j);
}

Future<List<Map<String, dynamic>>?> loadLifeGroups() async {
  return _net.requestList<Map<String, dynamic>>(
    ApiEndpoint.lifeGroups, fromJson: (j) => j);
}
```

**Note:** `ApiEndpoint.sectors` already maps to `/sectors`. `ApiEndpoint.lifeGroups` maps to `/life-groups/me` (user's own groups — wrong). Add a new entry:
```dart
allLifeGroups,   // → "/life-groups"
```
Use `ApiEndpoint.allLifeGroups` in `loadLifeGroups()`.

### State changes
Remove `TextEditingController` fields `_sectorId`, `_lifeGroupId`, `_leaderId`.

Replace with:
```dart
List<Map<String, dynamic>> _sectors = [];
List<Map<String, dynamic>> _lifeGroups = [];
int? _selectedSectorId;
int? _selectedLifeGroupId;
int? _selectedLeaderId;
String? _selectedLeaderName;
```

### Derived data
```dart
List<Map<String, dynamic>> get _filteredLifeGroups =>
  (_lifeGroups.where((lg) => lg['sector_id'] == _selectedSectorId).toList()
    ..sort((a, b) => (a['name'] as String).compareTo(b['name'] as String)));

List<Map<String, dynamic>> get _allLeaders {
  final seen = <int>{};
  final leaders = <Map<String, dynamic>>[];
  for (final lg in _lifeGroups) {
    final id = lg['leader_id'] as int?;
    if (id != null && seen.add(id)) {
      leaders.add({'id': id, 'name': lg['leader_name'] as String? ?? ''});
    }
  }
  leaders.sort((a, b) => (a['name'] as String).compareTo(b['name'] as String));
  return leaders;
}
```

### Cascade logic (same rules as Admin)
| User action | Effect |
|---|---|
| Pick sector | Clear LG + leader selections; filter LG picker |
| Pick life group | Set sector if null; pre-fill leader from LG data |
| Pick leader manually | Override leader only |

### UI
The three fields use the existing `_showCupertinoPicker` helper (already used for gender and civil state). No new UI components needed.

### Payload
```dart
'sector_id': _selectedSectorId,
if (_selectedLifeGroupId != null) 'life_group_id': _selectedLifeGroupId,
if (_selectedLeaderId != null) 'leader_id': _selectedLeaderId,
```

Remove the old `int.tryParse(...)` calls.

## Alphabetical ordering guarantee
- Backend already returns sectors and life groups ordered by `name ASC`
- Admin and Mobile both sort client-side after filtering, ensuring order is maintained after cascade

## Out of scope
- No DB migrations
- No new API endpoints
- No changes to the `POST /api/forms/member-registrations` or `POST /api/users/member` request contracts
