# Member Registration — Cascading Dropdowns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw ID text inputs in the member registration form with cascading Sector → Life Group → Leader dropdowns on both Admin UI and Mobile App.

**Architecture:** Client-side cascade — all sectors and life groups are loaded once on mount and filtered in-memory. Selecting a sector filters the life group list. Selecting a life group auto-sets the sector and pre-fills the leader (overridable). The only backend change is adding `leader_name` to the `GET /api/life-groups` response.

**Tech Stack:** NestJS (backend), Next.js 15 / React 19 / shadcn/ui (admin-ui), Flutter / GetX (mobile)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `backend/src/life-groups/life-groups.service.ts` | Modify | Add `leader_name` to `toResponse()` |
| `admin-ui/lib/api/types/life-groups.ts` | Modify | Add `leader_name: string \| null` to `LifeGroup` type |
| `admin-ui/app/(dashboard)/members/new/member-registration-form.tsx` | Modify | Cascading sector/LG/leader dropdowns |
| `mobile-app/lib/network/api/api_endpoint.dart` | Modify | Add `allLifeGroups` endpoint |
| `mobile-app/lib/services/formularios/formularios_service.dart` | Modify | Add `loadSectors()` and `loadLifeGroups()` |
| `mobile-app/lib/features/formularios/forms/member_registration_form.dart` | Modify | Replace text inputs with Cupertino pickers |

---

## Task 1: Backend — Add `leader_name` to life-groups response

**Files:**
- Modify: `backend/src/life-groups/life-groups.service.ts`

- [ ] **Step 1: Open the service and locate `toResponse()`**

File: `backend/src/life-groups/life-groups.service.ts`, around line 17.

Current `toResponse`:
```ts
private toResponse(lifeGroup: LifeGroup) {
  return {
    id: lifeGroup.id,
    name: lifeGroup.name,
    leader_id: lifeGroup.leader?.id ?? null,
    sector_id: lifeGroup.sector?.id ?? null,
    location: lifeGroup.location ?? null,
    meeting_day: lifeGroup.meetingDay ?? null,
    meeting_time: lifeGroup.meetingTime ?? null,
    member_count: lifeGroup.users?.length ?? 0,
    members: ...
    created_at: lifeGroup.createdAt,
    updated_at: lifeGroup.updatedAt,
  };
}
```

- [ ] **Step 2: Add `leader_name` to `toResponse()`**

Replace the `leader_id` line with:
```ts
leader_id: lifeGroup.leader?.id ?? null,
leader_name: lifeGroup.leader?.name ?? null,
```

The `leader` relation is already eagerly loaded in every caller, so no query changes are needed.

- [ ] **Step 3: Verify the server starts and returns the new field**

```bash
cd backend
npm run start:dev
```

In a separate terminal:
```bash
curl -s -H "Authorization: Bearer <your-jwt>" http://localhost:3001/api/life-groups | jq '.[0] | {id, name, leader_id, leader_name}'
```

Expected: response includes `"leader_name": "..."` (or `null` if no leader assigned).

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/life-groups/life-groups.service.ts
git commit -m "feat: add leader_name to life-groups response"
```

---

## Task 2: Admin UI — Update `LifeGroup` TypeScript type

**Files:**
- Modify: `admin-ui/lib/api/types/life-groups.ts`

- [ ] **Step 1: Add `leader_name` to the `LifeGroup` interface**

File: `admin-ui/lib/api/types/life-groups.ts`

Current interface:
```ts
export interface LifeGroup {
  id: number
  name: string
  location: string | null
  meeting_day: string | null
  meeting_time: string | null
  leader_id: number | null
  sector_id: number | null
  member_count: number
  members: LifeGroupMember[]
  created_at: string
  updated_at: string
}
```

Updated interface:
```ts
export interface LifeGroup {
  id: number
  name: string
  location: string | null
  meeting_day: string | null
  meeting_time: string | null
  leader_id: number | null
  leader_name: string | null
  sector_id: number | null
  member_count: number
  members: LifeGroupMember[]
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd admin-ui
npx tsc --noEmit
```

Expected: no errors (adding an optional-ish nullable field doesn't break existing consumers).

- [ ] **Step 3: Commit**

```bash
cd admin-ui
git add lib/api/types/life-groups.ts
git commit -m "feat: add leader_name to LifeGroup type"
```

---

## Task 3: Admin UI — Cascading dropdowns in member-registration-form

**Files:**
- Modify: `admin-ui/app/(dashboard)/members/new/member-registration-form.tsx`

Context: this form creates a new member user via `POST /api/users/member`. The existing `leader_name` field is a free-text `<Input>`. We replace it with a `<Select>` that is pre-filled when a life group is selected. The `sector_id` is submitted directly; `life_group_ids` is an array of one ID; `leader_name` is a string.

- [ ] **Step 1: Replace the form file with the new implementation**

Full replacement of `admin-ui/app/(dashboard)/members/new/member-registration-form.tsx`:

```tsx
"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useCreateMemberUser } from "@/lib/hooks/use-users"
import { useSectors } from "@/lib/hooks/use-sectors"
import { useCourses } from "@/lib/hooks/use-courses"
import { useLifeGroups } from "@/lib/hooks/use-life-groups"
import { formatPhoneBR, validatePhoneBR } from "@/lib/utils/phone"

const memberSchema = z.object({
  full_name: z.string().min(3, "Nome completo e obrigatorio"),
  birthday_date: z.string().min(1, "Data de nascimento e obrigatoria"),
  cellphone: z.string().refine(validatePhoneBR, {
    message: "Telefone invalido",
  }),
  address: z.string().optional(),
  sector_id: z.number({
    required_error: "Setor e obrigatorio",
  }),
  life_group_ids: z.array(z.number()).min(1, "Life Group e obrigatorio"),
  leader_name: z.string().optional(),
  completed_courses: z.array(z.number()).optional(),
})

type MemberFormData = z.infer<typeof memberSchema>

export function MemberRegistrationForm() {
  const router = useRouter()
  const createMutation = useCreateMemberUser()
  const { data: sectors = [] } = useSectors()
  const { data: courses = [] } = useCourses()
  const { data: lifeGroups = [] } = useLifeGroups()

  const [phoneValue, setPhoneValue] = useState("")
  const [selectedCourses, setSelectedCourses] = useState<number[]>([])
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null)
  const [selectedLifeGroupId, setSelectedLifeGroupId] = useState<number | null>(null)
  const [selectedLeaderName, setSelectedLeaderName] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
  })

  const sortedSectors = useMemo(
    () => [...sectors].sort((a, b) => a.name.localeCompare(b.name)),
    [sectors]
  )

  const filteredLifeGroups = useMemo(
    () =>
      lifeGroups
        .filter((lg) => lg.sector_id === selectedSectorId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [lifeGroups, selectedSectorId]
  )

  const allLeaders = useMemo(() => {
    const seen = new Map<string, string>()
    for (const lg of lifeGroups) {
      if (lg.leader_name && !seen.has(lg.leader_name)) {
        seen.set(lg.leader_name, lg.leader_name)
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b))
  }, [lifeGroups])

  const handleSectorChange = (value: string) => {
    const id = parseInt(value)
    setSelectedSectorId(id)
    setSelectedLifeGroupId(null)
    setSelectedLeaderName(null)
    setValue("sector_id", id)
    setValue("life_group_ids", [])
    setValue("leader_name", undefined)
  }

  const handleLifeGroupChange = (value: string) => {
    const id = parseInt(value)
    const lg = lifeGroups.find((g) => g.id === id)
    if (!lg) return

    setSelectedLifeGroupId(id)
    setValue("life_group_ids", [id])

    if (!selectedSectorId && lg.sector_id) {
      setSelectedSectorId(lg.sector_id)
      setValue("sector_id", lg.sector_id)
    }

    const leaderName = lg.leader_name ?? null
    setSelectedLeaderName(leaderName)
    setValue("leader_name", leaderName ?? undefined)
  }

  const handleLeaderChange = (value: string) => {
    setSelectedLeaderName(value)
    setValue("leader_name", value)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneBR(e.target.value)
    setPhoneValue(formatted)
    setValue("cellphone", formatted)
  }

  const handleCourseToggle = (courseId: number) => {
    setSelectedCourses((prev) => {
      const next = prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
      setValue("completed_courses", next)
      return next
    })
  }

  const onSubmit = async (data: MemberFormData) => {
    try {
      await createMutation.mutateAsync({
        ...data,
        completed_courses: selectedCourses.length > 0 ? selectedCourses : undefined,
      })
      toast.success("Usuario cadastrado com sucesso!")
      router.push("/members")
    } catch {
      toast.error("Erro ao cadastrar membro. Tente novamente.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Cadastro de Membro
        </h1>
        <p className="text-muted-foreground">
          Preencha os dados do novo membro
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Informacoes do Membro</CardTitle>
            <CardDescription>
              Todos os campos marcados com * sao obrigatorios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Nome Completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="full_name"
                  {...register("full_name")}
                  placeholder="Nome completo do membro"
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive">
                    {errors.full_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthday_date">
                  Data de Nascimento <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="birthday_date"
                  type="date"
                  {...register("birthday_date")}
                />
                {errors.birthday_date && (
                  <p className="text-sm text-destructive">
                    {errors.birthday_date.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cellphone">
                  Celular <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cellphone"
                  value={phoneValue}
                  onChange={handlePhoneChange}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
                {errors.cellphone && (
                  <p className="text-sm text-destructive">
                    {errors.cellphone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereco</Label>
                <Input
                  id="address"
                  {...register("address")}
                  placeholder="Endereco completo"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  Setor <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedSectorId?.toString() ?? ""}
                  onValueChange={handleSectorChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedSectors.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id.toString()}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.sector_id && (
                  <p className="text-sm text-destructive">
                    {errors.sector_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Life Group <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedLifeGroupId?.toString() ?? ""}
                  onValueChange={handleLifeGroupChange}
                  disabled={selectedSectorId === null}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        selectedSectorId === null
                          ? "Selecione um setor primeiro"
                          : "Selecione um Life Group"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLifeGroups.map((group) => (
                      <SelectItem key={group.id} value={String(group.id)}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.life_group_ids && (
                  <p className="text-sm text-destructive">
                    {errors.life_group_ids.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Lider</Label>
                <Select
                  value={selectedLeaderName ?? ""}
                  onValueChange={handleLeaderChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um lider" />
                  </SelectTrigger>
                  <SelectContent>
                    {allLeaders.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cursos Concluidos</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded-md p-4">
                {courses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum curso disponivel
                  </p>
                ) : (
                  courses
                    .filter((course) => course.status === "published")
                    .map((course) => (
                      <div key={course.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`course-${course.id}`}
                          checked={selectedCourses.includes(parseInt(course.id))}
                          onCheckedChange={() =>
                            handleCourseToggle(parseInt(course.id))
                          }
                        />
                        <Label
                          htmlFor={`course-${course.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {course.title}
                        </Label>
                      </div>
                    ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Cadastrando..." : "Cadastrar Membro"}
          </Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd admin-ui
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify the page loads without runtime errors**

```bash
cd admin-ui
npm run dev
```

Open `http://localhost:3000/members/new`. Confirm:
- Sector dropdown shows all sectors sorted A–Z
- Life Group dropdown is disabled until a sector is selected
- After picking a sector, Life Group shows only groups from that sector, sorted A–Z
- After picking a Life Group, Leader is pre-filled
- Leader dropdown can be overridden manually

- [ ] **Step 4: Commit**

```bash
cd admin-ui
git add app/\(dashboard\)/members/new/member-registration-form.tsx
git commit -m "feat: cascading sector/life-group/leader dropdowns in member registration"
```

---

## Task 4: Mobile — Add `allLifeGroups` API endpoint

**Files:**
- Modify: `mobile-app/lib/network/api/api_endpoint.dart`

- [ ] **Step 1: Add `allLifeGroups` to the enum**

File: `mobile-app/lib/network/api/api_endpoint.dart`

Find the enum declaration and add `allLifeGroups` as a new entry (near the existing `lifeGroups` entry):

```dart
allLifeGroups,
```

Then in the `path` switch/getter, add the case:

```dart
case ApiEndpoint.allLifeGroups:
  return "/life-groups";
```

Note: the existing `ApiEndpoint.lifeGroups` maps to `/life-groups/me` — do NOT change it, it's used elsewhere.

- [ ] **Step 2: Verify Flutter analyzes clean**

```bash
cd mobile-app
flutter analyze lib/network/api/api_endpoint.dart
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd mobile-app
git add lib/network/api/api_endpoint.dart
git commit -m "feat: add allLifeGroups API endpoint"
```

---

## Task 5: Mobile — Add `loadSectors` and `loadLifeGroups` to `FormulariosService`

**Files:**
- Modify: `mobile-app/lib/services/formularios/formularios_service.dart`

- [ ] **Step 1: Add the two loader methods**

File: `mobile-app/lib/services/formularios/formularios_service.dart`

Add after the existing `loadCourses()` method:

```dart
Future<List<Map<String, dynamic>>?> loadSectors() async {
  return _net.requestList<Map<String, dynamic>>(
    ApiEndpoint.sectors,
    fromJson: (j) => j,
  );
}

Future<List<Map<String, dynamic>>?> loadLifeGroups() async {
  return _net.requestList<Map<String, dynamic>>(
    ApiEndpoint.allLifeGroups,
    fromJson: (j) => j,
  );
}
```

- [ ] **Step 2: Verify Flutter analyzes clean**

```bash
cd mobile-app
flutter analyze lib/services/formularios/formularios_service.dart
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd mobile-app
git add lib/services/formularios/formularios_service.dart
git commit -m "feat: add loadSectors and loadLifeGroups to FormulariosService"
```

---

## Task 6: Mobile — Replace raw inputs with Cupertino pickers in member registration form

**Files:**
- Modify: `mobile-app/lib/features/formularios/forms/member_registration_form.dart`

This is the largest change. The three `TextEditingController` fields `_sectorId`, `_lifeGroupId`, `_leaderId` are removed and replaced with state variables and data lists. The existing `_showCupertinoPicker` helper is reused unchanged.

- [ ] **Step 1: Replace the entire form file**

Full replacement of `mobile-app/lib/features/formularios/forms/member_registration_form.dart`:

```dart
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../network/api/api_endpoint.dart';
import '../../../services/formularios/formularios_service.dart';
import '../../../services/formularios/models/form_course.dart';

class MemberRegistrationForm extends StatefulWidget {
  final VoidCallback? onSubmitted;
  const MemberRegistrationForm({super.key, this.onSubmitted});
  @override
  State<MemberRegistrationForm> createState() => _MemberRegistrationFormState();
}

class _MemberRegistrationFormState extends State<MemberRegistrationForm> {
  static const _genderLabels = {
    'M': 'Masculino',
    'F': 'Feminino',
  };

  static const _civilStateLabels = {
    'single': 'Solteiro(a)',
    'married': 'Casado(a)',
    'divorced': 'Divorciado(a)',
    'widowed': 'Viúvo(a)',
  };

  final _formKey = GlobalKey<FormState>();
  final _fullName = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _birthDate = TextEditingController();
  final _cep = TextEditingController();
  final _street = TextEditingController();
  final _addressNumber = TextEditingController();
  final _complement = TextEditingController();
  final _neighborhood = TextEditingController();
  final _city = TextEditingController();
  final _state = TextEditingController();

  String? _gender;
  String? _civilState;
  bool _submitting = false;
  bool _cepLoading = false;
  List<FormCourse> _courses = [];
  final Set<String> _selectedCourses = {};

  // Sector / Life Group / Leader state
  List<Map<String, dynamic>> _sectors = [];
  List<Map<String, dynamic>> _allLifeGroups = [];
  int? _selectedSectorId;
  String? _selectedSectorName;
  int? _selectedLifeGroupId;
  String? _selectedLifeGroupName;
  int? _selectedLeaderId;
  String? _selectedLeaderName;

  List<Map<String, dynamic>> get _filteredLifeGroups {
    final filtered = _allLifeGroups
        .where((lg) => lg['sector_id'] == _selectedSectorId)
        .toList();
    filtered.sort((a, b) =>
        (a['name'] as String).compareTo(b['name'] as String));
    return filtered;
  }

  List<Map<String, dynamic>> get _allLeaders {
    final seen = <int>{};
    final leaders = <Map<String, dynamic>>[];
    for (final lg in _allLifeGroups) {
      final id = lg['leader_id'] as int?;
      if (id != null && seen.add(id)) {
        leaders.add({
          'id': id,
          'name': lg['leader_name'] as String? ?? '',
        });
      }
    }
    leaders.sort((a, b) =>
        (a['name'] as String).compareTo(b['name'] as String));
    return leaders;
  }

  @override
  void initState() {
    super.initState();
    _loadInitialData();
    _cep.addListener(_onCepChanged);
  }

  Future<void> _loadInitialData() async {
    await Future.wait([_loadCourses(), _loadSectors(), _loadLifeGroups()]);
  }

  void _showCupertinoPicker<T>({
    required BuildContext context,
    required List<T> items,
    required String Function(T) label,
    required T? selectedItem,
    required void Function(T) onSelected,
    String emptyMessage = 'Nenhuma opção disponível',
  }) {
    if (items.isEmpty) {
      Get.snackbar('Aviso', emptyMessage, snackPosition: SnackPosition.BOTTOM);
      return;
    }
    final initialIndex = selectedItem == null
        ? 0
        : items.indexOf(selectedItem).clamp(0, items.length - 1);
    var tempIndex = initialIndex;

    showCupertinoModalPopup<void>(
      context: context,
      builder: (_) => Container(
        height: 300,
        color: CupertinoColors.systemBackground.resolveFrom(context),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                CupertinoButton(
                  child: const Text('Confirmar'),
                  onPressed: () {
                    onSelected(items[tempIndex]);
                    Navigator.of(context).pop();
                  },
                ),
              ],
            ),
            Expanded(
              child: CupertinoPicker(
                scrollController:
                    FixedExtentScrollController(initialItem: initialIndex),
                itemExtent: 40,
                onSelectedItemChanged: (i) => tempIndex = i,
                children: items
                    .map((e) => Center(child: Text(label(e))))
                    .toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _loadCourses() async {
    final svc = Get.find<FormulariosService>();
    final courses = await svc.loadCourses();
    if (courses != null && mounted) {
      setState(() => _courses = courses.where((c) => c.isActive).toList());
    }
  }

  Future<void> _loadSectors() async {
    final svc = Get.find<FormulariosService>();
    final sectors = await svc.loadSectors();
    if (sectors != null && mounted) {
      final sorted = List<Map<String, dynamic>>.from(sectors)
        ..sort((a, b) =>
            (a['name'] as String).compareTo(b['name'] as String));
      setState(() => _sectors = sorted);
    }
  }

  Future<void> _loadLifeGroups() async {
    final svc = Get.find<FormulariosService>();
    final groups = await svc.loadLifeGroups();
    if (groups != null && mounted) {
      setState(() => _allLifeGroups = List<Map<String, dynamic>>.from(groups));
    }
  }

  void _onSectorSelected(Map<String, dynamic> sector) {
    setState(() {
      _selectedSectorId = sector['id'] as int;
      _selectedSectorName = sector['name'] as String;
      _selectedLifeGroupId = null;
      _selectedLifeGroupName = null;
      _selectedLeaderId = null;
      _selectedLeaderName = null;
    });
  }

  void _onLifeGroupSelected(Map<String, dynamic> lg) {
    setState(() {
      _selectedLifeGroupId = lg['id'] as int;
      _selectedLifeGroupName = lg['name'] as String;

      if (_selectedSectorId == null && lg['sector_id'] != null) {
        _selectedSectorId = lg['sector_id'] as int;
        final sector = _sectors.firstWhereOrNull(
            (s) => s['id'] == _selectedSectorId);
        _selectedSectorName = sector?['name'] as String?;
      }

      final leaderId = lg['leader_id'] as int?;
      final leaderName = lg['leader_name'] as String?;
      _selectedLeaderId = leaderId;
      _selectedLeaderName = leaderName;
    });
  }

  void _onLeaderSelected(Map<String, dynamic> leader) {
    setState(() {
      _selectedLeaderId = leader['id'] as int;
      _selectedLeaderName = leader['name'] as String;
    });
  }

  void _onCepChanged() {
    final digits = _cep.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length == 8) _fetchCep(digits);
  }

  Future<void> _fetchCep(String digits) async {
    setState(() => _cepLoading = true);
    try {
      final svc = Get.find<FormulariosService>();
      final data = await svc.lookupCep(digits);
      if (data != null && mounted) {
        setState(() {
          _street.text = data['logradouro'] as String? ?? '';
          _neighborhood.text = data['bairro'] as String? ?? '';
          _city.text = data['localidade'] as String? ?? '';
          _state.text = data['uf'] as String? ?? '';
        });
      }
    } finally {
      if (mounted) setState(() => _cepLoading = false);
    }
  }

  @override
  void dispose() {
    _cep.removeListener(_onCepChanged);
    for (final c in [
      _fullName, _email, _phone, _birthDate, _cep, _street,
      _addressNumber, _complement, _neighborhood, _city, _state,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedSectorId == null) {
      Get.snackbar('Atenção', 'Selecione um setor',
          snackPosition: SnackPosition.BOTTOM);
      return;
    }
    setState(() => _submitting = true);
    try {
      final svc = Get.find<FormulariosService>();
      final payload = <String, dynamic>{
        'full_name': _fullName.text.trim(),
        'email': _email.text.trim(),
        'phone': _phone.text.trim(),
        'birth_date': _birthDate.text.trim(),
        'gender': _gender,
        'civil_state': _civilState,
        if (_cep.text.isNotEmpty)
          'cep': _cep.text.replaceAll(RegExp(r'\D'), ''),
        if (_street.text.isNotEmpty) 'street': _street.text.trim(),
        if (_addressNumber.text.isNotEmpty)
          'address_number': _addressNumber.text.trim(),
        if (_complement.text.isNotEmpty) 'complement': _complement.text.trim(),
        if (_neighborhood.text.isNotEmpty)
          'neighborhood': _neighborhood.text.trim(),
        if (_city.text.isNotEmpty) 'city': _city.text.trim(),
        if (_state.text.isNotEmpty) 'state': _state.text.trim(),
        'sector_id': _selectedSectorId!,
        if (_selectedLifeGroupId != null) 'life_group_id': _selectedLifeGroupId,
        if (_selectedLeaderId != null) 'leader_id': _selectedLeaderId,
        'completed_courses': _selectedCourses.toList(),
      };
      final result = await svc.createSubmission(
          ApiEndpoint.formMemberRegistrations, payload);
      if (result != null) {
        Get.snackbar('Pronto', 'Membro registrado',
            snackPosition: SnackPosition.BOTTOM);
        _formKey.currentState!.reset();
        for (final c in [
          _fullName, _email, _phone, _birthDate, _cep, _street,
          _addressNumber, _complement, _neighborhood, _city, _state,
        ]) {
          c.clear();
        }
        setState(() {
          _gender = null;
          _civilState = null;
          _selectedCourses.clear();
          _selectedSectorId = null;
          _selectedSectorName = null;
          _selectedLifeGroupId = null;
          _selectedLifeGroupName = null;
          _selectedLeaderId = null;
          _selectedLeaderName = null;
        });
        widget.onSubmitted?.call();
      } else {
        Get.snackbar('Erro', 'Não foi possível registrar',
            snackPosition: SnackPosition.BOTTOM);
      }
    } finally {
      setState(() => _submitting = false);
    }
  }

  Widget _buildPickerField({
    required String label,
    required String? displayValue,
    required VoidCallback onTap,
    String? errorText,
    bool enabled = true,
  }) =>
      InkWell(
        onTap: enabled ? onTap : null,
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: label,
            suffixIcon: const Icon(Icons.arrow_drop_down),
            errorText: errorText,
            enabled: enabled,
          ),
          child: Text(
            displayValue ?? '',
            style: TextStyle(
              fontSize: 16,
              color: enabled
                  ? null
                  : Theme.of(context).disabledColor,
            ),
          ),
        ),
      );

  @override
  Widget build(BuildContext context) => Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: _fullName,
              decoration:
                  const InputDecoration(labelText: 'Nome completo *'),
              validator: (v) =>
                  (v == null || v.trim().length < 2) ? 'Obrigatório' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _email,
              decoration: const InputDecoration(labelText: 'E-mail *'),
              keyboardType: TextInputType.emailAddress,
              validator: (v) =>
                  (v == null || !v.contains('@')) ? 'E-mail inválido' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phone,
              decoration:
                  const InputDecoration(labelText: 'WhatsApp *'),
              keyboardType: TextInputType.phone,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Obrigatório' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _birthDate,
              decoration: const InputDecoration(
                  labelText: 'Data de nascimento * (AAAA-MM-DD)'),
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Obrigatório' : null,
            ),
            const SizedBox(height: 12),
            FormField<String>(
              initialValue: _gender,
              validator: (v) => v == null ? 'Obrigatório' : null,
              builder: (state) => InkWell(
                onTap: () => _showCupertinoPicker<String>(
                  context: context,
                  items: _genderLabels.keys.toList(),
                  label: (v) => _genderLabels[v]!,
                  selectedItem: _gender,
                  onSelected: (v) {
                    setState(() => _gender = v);
                    state.didChange(v);
                  },
                ),
                child: InputDecorator(
                  decoration: InputDecoration(
                    labelText: 'Gênero *',
                    suffixIcon: const Icon(Icons.arrow_drop_down),
                    errorText: state.errorText,
                  ),
                  child: Text(
                    _gender != null ? _genderLabels[_gender]! : '',
                    style: const TextStyle(fontSize: 16),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            FormField<String>(
              initialValue: _civilState,
              validator: (v) => v == null ? 'Obrigatório' : null,
              builder: (state) => InkWell(
                onTap: () => _showCupertinoPicker<String>(
                  context: context,
                  items: _civilStateLabels.keys.toList(),
                  label: (v) => _civilStateLabels[v]!,
                  selectedItem: _civilState,
                  onSelected: (v) {
                    setState(() => _civilState = v);
                    state.didChange(v);
                  },
                ),
                child: InputDecorator(
                  decoration: InputDecoration(
                    labelText: 'Estado civil *',
                    suffixIcon: const Icon(Icons.arrow_drop_down),
                    errorText: state.errorText,
                  ),
                  child: Text(
                    _civilState != null
                        ? _civilStateLabels[_civilState]!
                        : '',
                    style: const TextStyle(fontSize: 16),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Endereço',
                style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _cep,
                    decoration:
                        const InputDecoration(labelText: 'CEP'),
                    keyboardType: TextInputType.number,
                    maxLength: 9,
                  ),
                ),
                const SizedBox(width: 8),
                if (_cepLoading)
                  const SizedBox(
                      width: 20,
                      height: 20,
                      child:
                          CircularProgressIndicator(strokeWidth: 2)),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
                controller: _street,
                decoration:
                    const InputDecoration(labelText: 'Rua')),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextFormField(
                    controller: _addressNumber,
                    decoration:
                        const InputDecoration(labelText: 'Número'),
                    keyboardType: TextInputType.number,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 3,
                  child: TextFormField(
                    controller: _complement,
                    decoration:
                        const InputDecoration(labelText: 'Complemento'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
                controller: _neighborhood,
                decoration:
                    const InputDecoration(labelText: 'Bairro')),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: TextFormField(
                      controller: _city,
                      decoration:
                          const InputDecoration(labelText: 'Cidade')),
                ),
                const SizedBox(width: 8),
                Expanded(
                  flex: 1,
                  child: TextFormField(
                    controller: _state,
                    decoration:
                        const InputDecoration(labelText: 'UF'),
                    maxLength: 2,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text('Grupo de Vida',
                style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            // Sector picker
            FormField<int>(
              validator: (_) =>
                  _selectedSectorId == null ? 'Obrigatório' : null,
              builder: (state) => _buildPickerField(
                label: 'Setor *',
                displayValue: _selectedSectorName,
                errorText: state.errorText,
                onTap: () => _showCupertinoPicker<Map<String, dynamic>>(
                  context: context,
                  items: _sectors,
                  label: (s) => s['name'] as String,
                  selectedItem: _sectors.firstWhereOrNull(
                      (s) => s['id'] == _selectedSectorId),
                  onSelected: (s) {
                    _onSectorSelected(s);
                    state.didChange(s['id'] as int);
                  },
                  emptyMessage: 'Nenhum setor disponível',
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Life Group picker (filtered by sector)
            _buildPickerField(
              label: 'Grupo de Vida',
              displayValue: _selectedLifeGroupName,
              enabled: _selectedSectorId != null,
              onTap: () => _showCupertinoPicker<Map<String, dynamic>>(
                context: context,
                items: _filteredLifeGroups,
                label: (lg) => lg['name'] as String,
                selectedItem: _filteredLifeGroups.firstWhereOrNull(
                    (lg) => lg['id'] == _selectedLifeGroupId),
                onSelected: _onLifeGroupSelected,
                emptyMessage: 'Nenhum grupo neste setor',
              ),
            ),
            const SizedBox(height: 12),
            // Leader picker (pre-filled from LG, overridable)
            _buildPickerField(
              label: 'Líder',
              displayValue: _selectedLeaderName,
              onTap: () => _showCupertinoPicker<Map<String, dynamic>>(
                context: context,
                items: _allLeaders,
                label: (l) => l['name'] as String,
                selectedItem: _allLeaders.firstWhereOrNull(
                    (l) => l['id'] == _selectedLeaderId),
                onSelected: _onLeaderSelected,
                emptyMessage: 'Nenhum líder disponível',
              ),
            ),
            if (_courses.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Text('Cursos concluídos',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              ..._courses.map((c) => CheckboxListTile(
                    value: _selectedCourses.contains(c.id),
                    title: Text(c.name),
                    onChanged: (checked) {
                      setState(() {
                        if (checked == true) {
                          _selectedCourses.add(c.id);
                        } else {
                          _selectedCourses.remove(c.id);
                        }
                      });
                    },
                    controlAffinity: ListTileControlAffinity.leading,
                    dense: true,
                  )),
            ],
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _submitting ? null : _submit,
              child: _submitting
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Salvar'),
            ),
          ],
        ),
      );
}
```

- [ ] **Step 2: Verify Flutter analyzes clean**

```bash
cd mobile-app
flutter analyze lib/features/formularios/forms/member_registration_form.dart
```

Expected: no errors or warnings.

- [ ] **Step 3: Run on a device/emulator and verify**

```bash
cd mobile-app
flutter run
```

Navigate to Formulários → Registro de Membro. Confirm:
- Setor picker shows all sectors sorted A–Z
- After picking a sector, Grupo de Vida shows only groups in that sector, sorted A–Z
- Picking a Grupo de Vida pre-fills Líder
- Líder picker can be overridden with any leader from all groups, sorted A–Z
- Submitting sends correct `sector_id`, `life_group_id`, `leader_id` integers

- [ ] **Step 4: Commit**

```bash
cd mobile-app
git add lib/features/formularios/forms/member_registration_form.dart
git commit -m "feat: cascading sector/life-group/leader pickers in member registration"
```

---

## Task 7: Root repo — Update submodule pointers

- [ ] **Step 1: Commit updated submodule pointers in the root repo**

```bash
cd /Users/jonathalima/Developer/church
git add backend admin-ui mobile-app
git commit -m "chore: update submodule pointers — cascading member registration dropdowns"
```
