"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ChevronRight,
  Users,
  Building2,
  Layers,
  HeartHandshake,
  Info,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useOrgChart } from "@/lib/hooks/use-areas"
import { useUpdateSector } from "@/lib/hooks/use-sectors"
import { useUpdateLifeGroup } from "@/lib/hooks/use-life-groups"
import { getApiErrorMessage } from "@/lib/api/client"
import type {
  AreaHierarchyLifeGroup,
  AreaHierarchySector,
  OrgChartArea,
  OrgChartRoot,
} from "@/lib/api/types"

const NONE = "none"

type SelectedNode =
  | { type: "root"; root: OrgChartRoot }
  | { type: "area"; area: OrgChartArea; rootLabel: string }
  | { type: "sector"; sector: AreaHierarchySector; areaName: string }
  | {
      type: "life_group"
      lifeGroup: AreaHierarchyLifeGroup
      sectorName: string
    }
  | null

export function OrgChartTree() {
  const { data: orgChart, isLoading, error } = useOrgChart()
  const updateSectorMutation = useUpdateSector()
  const updateLifeGroupMutation = useUpdateLifeGroup()

  const [selected, setSelected] = useState<SelectedNode>(null)
  const [pendingDetach, setPendingDetach] = useState<
    | { kind: "sector"; id: number }
    | { kind: "life_group"; id: number }
    | null
  >(null)

  const allAreas = [
    ...(orgChart?.roots ?? []).flatMap((root) => root.areas),
    ...(orgChart?.unassigned_areas ?? []),
  ]
  const allAreaOptions = allAreas.map((area) => ({ id: area.id, name: area.name }))
  const allSectorOptions = [
    ...allAreas.flatMap((area) => area.sectors),
    ...(orgChart?.unassigned_sectors ?? []),
  ].map((sector) => ({ id: sector.id, name: sector.name }))

  const handleMoveSector = async (sectorId: number, areaId: number | null) => {
    if (areaId === null) {
      setPendingDetach({ kind: "sector", id: sectorId })
      return
    }
    await moveSector(sectorId, areaId)
  }

  const moveSector = async (sectorId: number, areaId: number | null) => {
    try {
      await updateSectorMutation.mutateAsync({
        id: sectorId,
        data: { area_id: areaId },
      })
      toast.success("Setor movido com sucesso!")
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erro ao mover o setor. Tente novamente."))
    }
  }

  const handleMoveLifeGroup = async (lifeGroupId: number, sectorId: number | null) => {
    if (sectorId === null) {
      setPendingDetach({ kind: "life_group", id: lifeGroupId })
      return
    }
    await moveLifeGroup(lifeGroupId, sectorId)
  }

  const moveLifeGroup = async (lifeGroupId: number, sectorId: number | null) => {
    try {
      await updateLifeGroupMutation.mutateAsync({
        id: lifeGroupId,
        data: { sector_id: sectorId },
      })
      toast.success("Life group movido com sucesso!")
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Erro ao mover o life group. Tente novamente.")
      )
    }
  }

  const confirmDetach = async () => {
    if (!pendingDetach) return
    if (pendingDetach.kind === "sector") {
      await moveSector(pendingDetach.id, null)
    } else {
      await moveLifeGroup(pendingDetach.id, null)
    }
    setPendingDetach(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-destructive text-center py-8">
        Erro ao carregar o organograma. Tente novamente mais tarde.
      </p>
    )
  }

  const hasUnassigned =
    (orgChart?.unassigned_areas.length ?? 0) > 0 ||
    (orgChart?.unassigned_sectors.length ?? 0) > 0 ||
    (orgChart?.unassigned_life_groups.length ?? 0) > 0

  if (!orgChart || (orgChart.roots.length === 0 && !hasUnassigned)) {
    return (
      <p className="text-muted-foreground text-center py-8">
        Nenhuma liderança pastoral vinculada ainda.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {orgChart.roots.map((root) => (
        <RootNode
          key={root.id}
          root={root}
          areaOptions={allAreaOptions}
          sectorOptions={allSectorOptions}
          onSelect={setSelected}
          onMoveSector={handleMoveSector}
          onMoveLifeGroup={handleMoveLifeGroup}
        />
      ))}

      {orgChart.unassigned_areas.length > 0 && (
        <div className="rounded-lg border border-dashed p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Sem pastor vinculado</Badge>
          </div>
          <div className="space-y-3 pl-6 border-l">
            {orgChart.unassigned_areas.map((area) => (
              <AreaNode
                key={area.id}
                area={area}
                rootLabel="Sem pastor vinculado"
                areaOptions={allAreaOptions}
                sectorOptions={allSectorOptions}
                onSelect={setSelected}
                onMoveSector={handleMoveSector}
                onMoveLifeGroup={handleMoveLifeGroup}
              />
            ))}
          </div>
        </div>
      )}

      {orgChart.unassigned_sectors.length > 0 && (
        <div className="rounded-lg border border-dashed p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Setores sem área vinculada</Badge>
          </div>
          <div className="space-y-3 pl-6 border-l">
            {orgChart.unassigned_sectors.map((sector) => (
              <SectorNode
                key={sector.id}
                sector={sector}
                areaName="Sem área vinculada"
                areaOptions={allAreaOptions}
                sectorOptions={allSectorOptions}
                onSelect={setSelected}
                onMoveSector={handleMoveSector}
                onMoveLifeGroup={handleMoveLifeGroup}
                currentAreaId={null}
              />
            ))}
          </div>
        </div>
      )}

      {orgChart.unassigned_life_groups.length > 0 && (
        <div className="rounded-lg border border-dashed p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Life groups sem setor vinculado</Badge>
          </div>
          <div className="space-y-3 pl-6 border-l">
            {orgChart.unassigned_life_groups.map((lifeGroup) => (
              <LifeGroupNode
                key={lifeGroup.id}
                lifeGroup={lifeGroup}
                sectorName="Sem setor vinculado"
                sectorOptions={allSectorOptions}
                currentSectorId={null}
                onSelect={setSelected}
                onMoveLifeGroup={handleMoveLifeGroup}
              />
            ))}
          </div>
        </div>
      )}

      <NodeDetailsSheet selected={selected} onOpenChange={(open) => !open && setSelected(null)} />

      <AlertDialog open={pendingDetach !== null} onOpenChange={(open) => !open && setPendingDetach(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vínculo?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDetach?.kind === "sector"
                ? "Este setor ficará sem área vinculada."
                : "Este life group ficará sem setor vinculado."}{" "}
              Esta ação pode ser desfeita movendo o item novamente depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDetach}>Remover vínculo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function RootNode({
  root,
  areaOptions,
  sectorOptions,
  onSelect,
  onMoveSector,
  onMoveLifeGroup,
}: {
  root: OrgChartRoot
  areaOptions: { id: number; name: string }[]
  sectorOptions: { id: number; name: string }[]
  onSelect: (node: SelectedNode) => void
  onMoveSector: (sectorId: number, areaId: number | null) => void
  onMoveLifeGroup: (lifeGroupId: number, sectorId: number | null) => void
}) {
  const [open, setOpen] = useState(true)
  const rootLabel = [root.pastor_name, root.co_pastor_name].filter(Boolean).join(" & ")

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 text-left flex-1">
            <ChevronRight
              className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
            />
            <HeartHandshake className="h-4 w-4 text-muted-foreground" />
            <Badge>Liderança Pastoral</Badge>
            <span className="font-semibold">{rootLabel}</span>
          </button>
        </CollapsibleTrigger>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label="Ver detalhes"
          onClick={(e) => {
            e.stopPropagation()
            onSelect({ type: "root", root })
          }}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      <CollapsibleContent>
        {root.areas.length === 0 ? (
          <p className="text-sm text-muted-foreground pl-6">
            Nenhuma área vinculada a esta liderança.
          </p>
        ) : (
          <div className="space-y-3 pl-6 border-l">
            {root.areas.map((area) => (
              <AreaNode
                key={area.id}
                area={area}
                rootLabel={rootLabel}
                areaOptions={areaOptions}
                sectorOptions={sectorOptions}
                onSelect={onSelect}
                onMoveSector={onMoveSector}
                onMoveLifeGroup={onMoveLifeGroup}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function AreaNode({
  area,
  rootLabel,
  areaOptions,
  sectorOptions,
  onSelect,
  onMoveSector,
  onMoveLifeGroup,
}: {
  area: OrgChartArea
  rootLabel: string
  areaOptions: { id: number; name: string }[]
  sectorOptions: { id: number; name: string }[]
  onSelect: (node: SelectedNode) => void
  onMoveSector: (sectorId: number, areaId: number | null) => void
  onMoveLifeGroup: (lifeGroupId: number, sectorId: number | null) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 text-left flex-1">
            <ChevronRight
              className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
            />
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline">Área</Badge>
            <span className="font-medium">{area.name}</span>
            <span className="text-sm text-muted-foreground">
              {area.leader_name ?? "Sem líder"}
              {area.co_leader_name ? ` · ${area.co_leader_name}` : ""}
            </span>
          </button>
        </CollapsibleTrigger>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label="Ver detalhes"
          onClick={(e) => {
            e.stopPropagation()
            onSelect({ type: "area", area, rootLabel })
          }}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      <CollapsibleContent>
        {area.sectors.length === 0 ? (
          <p className="text-sm text-muted-foreground pl-6">Nenhum setor nesta área.</p>
        ) : (
          <div className="space-y-3 pl-6 border-l">
            {area.sectors.map((sector) => (
              <SectorNode
                key={sector.id}
                sector={sector}
                areaName={area.name}
                areaOptions={areaOptions}
                sectorOptions={sectorOptions}
                onSelect={onSelect}
                onMoveSector={onMoveSector}
                onMoveLifeGroup={onMoveLifeGroup}
                currentAreaId={area.id}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function SectorNode({
  sector,
  areaName,
  areaOptions,
  sectorOptions,
  onSelect,
  onMoveSector,
  onMoveLifeGroup,
  currentAreaId,
}: {
  sector: AreaHierarchySector
  areaName: string
  areaOptions: { id: number; name: string }[]
  sectorOptions: { id: number; name: string }[]
  onSelect: (node: SelectedNode) => void
  onMoveSector: (sectorId: number, areaId: number | null) => void
  onMoveLifeGroup: (lifeGroupId: number, sectorId: number | null) => void
  currentAreaId: number | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 text-left flex-1">
            <ChevronRight
              className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
            />
            <Layers className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary">Setor</Badge>
            <span className="font-medium">{sector.name}</span>
            <span className="text-sm text-muted-foreground">
              {sector.leader_name ?? "Sem líder"}
              {sector.co_leader_name ? ` · ${sector.co_leader_name}` : ""}
            </span>
          </button>
        </CollapsibleTrigger>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label="Ver detalhes"
          onClick={(e) => {
            e.stopPropagation()
            onSelect({ type: "sector", sector, areaName })
          }}
        >
          <Info className="h-4 w-4" />
        </Button>
        <MoveSelect
          value={currentAreaId}
          placeholder="Mover para área"
          noneLabel="Sem área"
          options={areaOptions}
          onChange={(areaId) => onMoveSector(sector.id, areaId)}
        />
      </div>

      <CollapsibleContent>
        {sector.life_groups.length === 0 ? (
          <p className="text-sm text-muted-foreground pl-6">Nenhum life group neste setor.</p>
        ) : (
          <div className="space-y-2 pl-6 border-l">
            {sector.life_groups.map((lifeGroup) => (
              <LifeGroupNode
                key={lifeGroup.id}
                lifeGroup={lifeGroup}
                sectorName={sector.name}
                sectorOptions={sectorOptions}
                currentSectorId={sector.id}
                onSelect={onSelect}
                onMoveLifeGroup={onMoveLifeGroup}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function LifeGroupNode({
  lifeGroup,
  sectorName,
  sectorOptions,
  currentSectorId,
  onSelect,
  onMoveLifeGroup,
}: {
  lifeGroup: AreaHierarchyLifeGroup
  sectorName: string
  sectorOptions: { id: number; name: string }[]
  currentSectorId: number | null
  onSelect: (node: SelectedNode) => void
  onMoveLifeGroup: (lifeGroupId: number, sectorId: number | null) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        className="flex items-center gap-2 text-left"
        onClick={() => onSelect({ type: "life_group", lifeGroup, sectorName })}
      >
        <Users className="h-4 w-4 text-muted-foreground" />
        <span>{lifeGroup.name}</span>
        <span className="text-sm text-muted-foreground">
          {lifeGroup.leader_name ?? "Sem líder"}
          {lifeGroup.co_leader_name ? ` · ${lifeGroup.co_leader_name}` : ""}
        </span>
      </button>
      <MoveSelect
        value={currentSectorId}
        placeholder="Mover para setor"
        noneLabel="Sem setor"
        options={sectorOptions}
        onChange={(sectorId) => onMoveLifeGroup(lifeGroup.id, sectorId)}
      />
    </div>
  )
}

function MoveSelect({
  value,
  placeholder,
  noneLabel,
  options,
  onChange,
}: {
  value: number | null
  placeholder: string
  noneLabel: string
  options: { id: number; name: string }[]
  onChange: (id: number | null) => void
}) {
  return (
    <Select
      value={value === null ? NONE : String(value)}
      onValueChange={(v) => onChange(v === NONE ? null : Number(v))}
    >
      <SelectTrigger className="w-[200px] h-8" aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{noneLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={String(option.id)}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function NodeDetailsSheet({
  selected,
  onOpenChange,
}: {
  selected: SelectedNode
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={selected !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        {selected?.type === "root" && (
          <>
            <SheetHeader>
              <SheetTitle>
                {[selected.root.pastor_name, selected.root.co_pastor_name]
                  .filter(Boolean)
                  .join(" & ")}
              </SheetTitle>
              <SheetDescription>Liderança pastoral</SheetDescription>
            </SheetHeader>
            <div className="px-4 space-y-4">
              <DetailRow label="Pastor" value={selected.root.pastor_name} />
              <DetailRow label="Co-pastora" value={selected.root.co_pastor_name} />
              <DetailRow
                label="Áreas vinculadas"
                value={String(selected.root.areas.length)}
              />
            </div>
          </>
        )}

        {selected?.type === "area" && (
          <>
            <SheetHeader>
              <SheetTitle>{selected.area.name}</SheetTitle>
              <SheetDescription>Área</SheetDescription>
            </SheetHeader>
            <div className="px-4 space-y-4">
              <DetailRow label="Liderança pastoral" value={selected.rootLabel} />
              <DetailRow label="Líder" value={selected.area.leader_name} />
              <DetailRow label="Co-líder" value={selected.area.co_leader_name} />
              <DetailRow
                label="Setores"
                value={selected.area.sectors.map((s) => s.name).join(", ") || "Nenhum"}
              />
              <Button asChild variant="outline" size="sm">
                <Link href="/areas">Ver na lista de áreas</Link>
              </Button>
            </div>
          </>
        )}

        {selected?.type === "sector" && (
          <>
            <SheetHeader>
              <SheetTitle>{selected.sector.name}</SheetTitle>
              <SheetDescription>Setor</SheetDescription>
            </SheetHeader>
            <div className="px-4 space-y-4">
              <DetailRow label="Área" value={selected.areaName} />
              <DetailRow label="Líder" value={selected.sector.leader_name} />
              <DetailRow label="Co-líder" value={selected.sector.co_leader_name} />
              <DetailRow
                label="Life groups"
                value={
                  selected.sector.life_groups.map((lg) => lg.name).join(", ") || "Nenhum"
                }
              />
              <Button asChild variant="outline" size="sm">
                <Link href="/sectors">Ver na lista de setores</Link>
              </Button>
            </div>
          </>
        )}

        {selected?.type === "life_group" && (
          <>
            <SheetHeader>
              <SheetTitle>{selected.lifeGroup.name}</SheetTitle>
              <SheetDescription>Life group</SheetDescription>
            </SheetHeader>
            <div className="px-4 space-y-4">
              <DetailRow label="Setor" value={selected.sectorName} />
              <DetailRow label="Líder" value={selected.lifeGroup.leader_name} />
              <DetailRow label="Co-líder" value={selected.lifeGroup.co_leader_name} />
              <Button asChild variant="outline" size="sm">
                <Link href="/life-groups">Ver na lista de life groups</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value ?? "—"}</p>
    </div>
  )
}
