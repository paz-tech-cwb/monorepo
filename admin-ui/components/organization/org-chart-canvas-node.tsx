"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Building2, HeartHandshake, Layers, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { OrgCanvasNode } from "@/lib/org-chart/build-graph"

const KIND_ICON = {
  root: HeartHandshake,
  area: Building2,
  sector: Layers,
  life_group: Users,
  unassigned: Layers,
} as const

const KIND_BADGE_VARIANT = {
  root: "default",
  area: "outline",
  sector: "secondary",
  unassigned: "outline",
  life_group: "outline",
} as const

function OrgChartCanvasNodeComponent({ data }: NodeProps<OrgCanvasNode>) {
  const Icon = KIND_ICON[data.kind]
  const badgeVariant = KIND_BADGE_VARIANT[data.kind]
  const isClickable = data.selected !== null

  const handleActivate = () => {
    data.onActivate?.()
  }

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col justify-center gap-1 rounded-lg border bg-card px-3 py-2 text-card-foreground shadow-sm",
        data.unassigned && "border-dashed",
        isClickable ? "cursor-pointer" : "cursor-default"
      )}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? data.title : undefined}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                handleActivate()
              }
            }
          : undefined
      }
    >
      {data.kind !== "root" && data.kind !== "unassigned" && (
        <Handle type="target" position={Position.Top} className="!bg-border" />
      )}

      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Badge variant={badgeVariant} className="text-[10px] px-1.5 py-0">
          {data.badge}
        </Badge>
      </div>
      <p className="truncate text-sm font-medium leading-tight" title={data.title}>
        {data.title}
      </p>
      {data.subtitle && (
        <p className="truncate text-xs text-muted-foreground" title={data.subtitle}>
          {data.subtitle}
        </p>
      )}
      {data.childCountLabel && (
        <p className="truncate text-xs text-muted-foreground">{data.childCountLabel}</p>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-border" />
    </div>
  )
}

export const OrgChartCanvasNode = memo(OrgChartCanvasNodeComponent)

export const orgChartNodeTypes = {
  orgChartNode: OrgChartCanvasNode,
}
