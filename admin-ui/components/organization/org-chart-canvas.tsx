"use client"

import "@xyflow/react/dist/style.css"

import { useMemo, useState, type ReactNode } from "react"
import { useTheme } from "next-themes"
import { Background, Controls, MiniMap, ReactFlow, type NodeMouseHandler } from "@xyflow/react"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MoveSelect,
  NodeDetailsSheet,
  OrgChartDetachDialog,
  buildMoveOptions,
  useOrgChartMoves,
  type SelectedNode,
} from "@/components/organization/org-chart-shared"
import { orgChartNodeTypes } from "@/components/organization/org-chart-canvas-node"
import { buildOrgGraph, type OrgCanvasNode } from "@/lib/org-chart/build-graph"

export function OrgChartCanvas() {
  const {
    orgChart,
    isLoading,
    error,
    pendingDetach,
    handleMoveSector,
    handleMoveLifeGroup,
    confirmDetach,
    clearPendingDetach,
  } = useOrgChartMoves()
  const { resolvedTheme } = useTheme()

  const [selected, setSelected] = useState<SelectedNode>(null)

  const { allAreaOptions, allSectorOptions } = buildMoveOptions(orgChart)

  const { nodes, edges } = useMemo(() => {
    if (!orgChart) return { nodes: [], edges: [] }
    return buildOrgGraph(orgChart)
  }, [orgChart])

  const handleNodeClick: NodeMouseHandler<OrgCanvasNode> = (_event, node) => {
    if (node.data.selected) {
      setSelected(node.data.selected)
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

  let footer: ReactNode = null
  if (selected?.type === "sector") {
    footer = (
      <div className="px-4">
        <MoveSelect
          value={selected.sector.area_id}
          placeholder="Mover para área"
          noneLabel="Sem área"
          options={allAreaOptions}
          onChange={(areaId) => handleMoveSector(selected.sector.id, areaId)}
        />
      </div>
    )
  } else if (selected?.type === "life_group") {
    footer = (
      <div className="px-4">
        <MoveSelect
          value={selected.lifeGroup.sector_id}
          placeholder="Mover para setor"
          noneLabel="Sem setor"
          options={allSectorOptions}
          onChange={(sectorId) => handleMoveLifeGroup(selected.lifeGroup.id, sectorId)}
        />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-11rem)] min-h-[500px] w-full rounded-lg border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={orgChartNodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={handleNodeClick}
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>

      <NodeDetailsSheet
        selected={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        footer={footer}
      />

      <AlertDialog open={pendingDetach !== null} onOpenChange={(open) => !open && clearPendingDetach()}>
        <OrgChartDetachDialog
          pending={pendingDetach}
          onCancel={clearPendingDetach}
          onConfirm={confirmDetach}
        />
      </AlertDialog>
    </div>
  )
}
