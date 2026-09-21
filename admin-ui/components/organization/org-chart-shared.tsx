"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
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
import { Button } from "@/components/ui/button"
import { useOrgChart } from "@/lib/hooks/use-areas"
import { useUpdateSector } from "@/lib/hooks/use-sectors"
import { useUpdateLifeGroup } from "@/lib/hooks/use-life-groups"
import { getApiErrorMessage } from "@/lib/api/client"
import type {
  AreaHierarchyLifeGroup,
  AreaHierarchySector,
  OrgChart,
  OrgChartArea,
  OrgChartRoot,
} from "@/lib/api/types"

export const NONE = "none"

export type SelectedNode =
  | { type: "root"; root: OrgChartRoot }
  | { type: "area"; area: OrgChartArea; rootLabel: string }
  | { type: "sector"; sector: AreaHierarchySector; areaName: string }
  | {
      type: "life_group"
      lifeGroup: AreaHierarchyLifeGroup
      sectorName: string
    }
  | null

export type SelectedNodeRef =
  | { type: "root"; id: string }
  | { type: "area"; id: number }
  | { type: "sector"; id: number }
  | { type: "life_group"; id: number }
  | null

/**
 * Derives a live SelectedNode payload from the current orgChart data for a
 * lightweight ref, so consumers never render a stale pre-move snapshot.
 */
export function resolveSelectedNode(
  orgChart: OrgChart | undefined,
  ref: SelectedNodeRef
): SelectedNode {
  if (!orgChart || !ref) return null

  const allRoots = orgChart.roots
  const allAreas = [
    ...allRoots.flatMap((root) => root.areas),
    ...orgChart.unassigned_areas,
  ]
  const allSectors = [
    ...allAreas.flatMap((area) => area.sectors),
    ...orgChart.unassigned_sectors,
  ]
  const allLifeGroups = [
    ...allSectors.flatMap((sector) => sector.life_groups),
    ...orgChart.unassigned_life_groups,
  ]

  if (ref.type === "root") {
    const root = allRoots.find((r) => r.id === ref.id)
    return root ? { type: "root", root } : null
  }

  if (ref.type === "area") {
    const area = allAreas.find((a) => a.id === ref.id)
    if (!area) return null
    const parentRoot = allRoots.find((root) => root.areas.some((a) => a.id === ref.id))
    const rootLabel = parentRoot
      ? [parentRoot.pastor_name, parentRoot.co_pastor_name].filter(Boolean).join(" & ")
      : "Sem pastor vinculado"
    return { type: "area", area, rootLabel }
  }

  if (ref.type === "sector") {
    const sector = allSectors.find((s) => s.id === ref.id)
    if (!sector) return null
    const parentArea = allAreas.find((area) => area.sectors.some((s) => s.id === ref.id))
    return { type: "sector", sector, areaName: parentArea?.name ?? "Sem área vinculada" }
  }

  const lifeGroup = allLifeGroups.find((lg) => lg.id === ref.id)
  if (!lifeGroup) return null
  const parentSector = allSectors.find((sector) =>
    sector.life_groups.some((lg) => lg.id === ref.id)
  )
  return {
    type: "life_group",
    lifeGroup,
    sectorName: parentSector?.name ?? "Sem setor vinculado",
  }
}

export function MoveSelect({
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

export function NodeDetailsSheet({
  selected,
  onOpenChange,
  footer,
}: {
  selected: SelectedNode
  onOpenChange: (open: boolean) => void
  footer?: ReactNode
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

        {footer}
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

export function OrgChartDetachDialog({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: { kind: "sector" | "life_group"; id: number } | null
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remover vínculo?</AlertDialogTitle>
        <AlertDialogDescription>
          {pending?.kind === "sector"
            ? "Este setor ficará sem área vinculada."
            : "Este life group ficará sem setor vinculado."}{" "}
          Esta ação pode ser desfeita movendo o item novamente depois.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Remover vínculo</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}

export function buildMoveOptions(
  orgChart:
    | {
        roots: OrgChartRoot[]
        unassigned_areas: OrgChartArea[]
        unassigned_sectors: AreaHierarchySector[]
      }
    | undefined
) {
  const allAreas = [
    ...(orgChart?.roots ?? []).flatMap((root) => root.areas),
    ...(orgChart?.unassigned_areas ?? []),
  ]
  const allAreaOptions = allAreas.map((area) => ({ id: area.id, name: area.name }))
  const allSectorOptions = [
    ...allAreas.flatMap((area) => area.sectors),
    ...(orgChart?.unassigned_sectors ?? []),
  ].map((sector) => ({ id: sector.id, name: sector.name }))

  return { allAreas, allAreaOptions, allSectorOptions }
}

export function useOrgChartMoves() {
  const { data: orgChart, isLoading, error } = useOrgChart()
  const updateSectorMutation = useUpdateSector()
  const updateLifeGroupMutation = useUpdateLifeGroup()

  const [pendingDetach, setPendingDetach] = useState<
    | { kind: "sector"; id: number }
    | { kind: "life_group"; id: number }
    | null
  >(null)

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

  const clearPendingDetach = () => setPendingDetach(null)

  return {
    orgChart,
    isLoading,
    error,
    pendingDetach,
    handleMoveSector,
    handleMoveLifeGroup,
    confirmDetach,
    clearPendingDetach,
  }
}
