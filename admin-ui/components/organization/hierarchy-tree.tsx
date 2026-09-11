"use client"

import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useAreaHierarchy } from "@/lib/hooks/use-areas"
import { useUpdateSector } from "@/lib/hooks/use-sectors"
import { useUpdateLifeGroup } from "@/lib/hooks/use-life-groups"
import { getApiErrorMessage } from "@/lib/api/client"
import { ChevronRight, Users } from "lucide-react"

const NONE = "none"

export function HierarchyTree() {
  const { data: hierarchy = [], isLoading, error } = useAreaHierarchy()
  const updateSectorMutation = useUpdateSector()
  const updateLifeGroupMutation = useUpdateLifeGroup()

  const allAreaOptions = hierarchy.map((area) => ({ id: area.id, name: area.name }))
  const allSectorOptions = hierarchy.flatMap((area) =>
    area.sectors.map((sector) => ({ id: sector.id, name: sector.name }))
  )

  const handleMoveSector = async (sectorId: number, areaId: number | null) => {
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
        Erro ao carregar a hierarquia. Tente novamente mais tarde.
      </p>
    )
  }

  if (hierarchy.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        Nenhuma área cadastrada ainda.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {hierarchy.map((area) => (
        <div key={area.id} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Área</Badge>
              <span className="font-semibold">{area.name}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {area.leader_name ?? "Sem líder"}
              {area.co_leader_name ? ` · ${area.co_leader_name}` : ""}
            </span>
          </div>

          {area.sectors.length === 0 ? (
            <p className="text-sm text-muted-foreground pl-6">
              Nenhum setor nesta área.
            </p>
          ) : (
            <div className="space-y-3 pl-6 border-l">
              {area.sectors.map((sector) => (
                <div key={sector.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="secondary">Setor</Badge>
                      <span className="font-medium">{sector.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {sector.leader_name ?? "Sem líder"}
                        {sector.co_leader_name ? ` · ${sector.co_leader_name}` : ""}
                      </span>
                    </div>
                    <Select
                      value={String(area.id)}
                      onValueChange={(v) =>
                        handleMoveSector(sector.id, v === NONE ? null : Number(v))
                      }
                    >
                      <SelectTrigger className="w-[200px] h-8">
                        <SelectValue placeholder="Mover para área" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Sem área</SelectItem>
                        {allAreaOptions.map((option) => (
                          <SelectItem key={option.id} value={String(option.id)}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {sector.life_groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-6">
                      Nenhum life group neste setor.
                    </p>
                  ) : (
                    <div className="space-y-2 pl-6 border-l">
                      {sector.life_groups.map((lifeGroup) => (
                        <div
                          key={lifeGroup.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{lifeGroup.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {lifeGroup.leader_name ?? "Sem líder"}
                              {lifeGroup.co_leader_name
                                ? ` · ${lifeGroup.co_leader_name}`
                                : ""}
                            </span>
                          </div>
                          <Select
                            value={String(sector.id)}
                            onValueChange={(v) =>
                              handleMoveLifeGroup(
                                lifeGroup.id,
                                v === NONE ? null : Number(v)
                              )
                            }
                          >
                            <SelectTrigger className="w-[200px] h-8">
                              <SelectValue placeholder="Mover para setor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>Sem setor</SelectItem>
                              {allSectorOptions.map((option) => (
                                <SelectItem key={option.id} value={String(option.id)}>
                                  {option.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
