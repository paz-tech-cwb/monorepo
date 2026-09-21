import dagre from "@dagrejs/dagre"
import type { Edge, Node } from "@xyflow/react"
import type { SelectedNode } from "@/components/organization/org-chart-shared"
import type { OrgChart } from "@/lib/api/types"

export const NODE_WIDTH = 240
export const NODE_HEIGHT = 88

export type OrgCanvasNodeKind = "root" | "area" | "sector" | "life_group" | "unassigned"

export interface OrgCanvasNodeData extends Record<string, unknown> {
  kind: OrgCanvasNodeKind
  badge: string
  title: string
  subtitle: string | null
  childCountLabel: string | null
  unassigned: boolean
  selected: SelectedNode
}

export type OrgCanvasNode = Node<OrgCanvasNodeData>

interface BuildGraphResult {
  nodes: OrgCanvasNode[]
  edges: Edge[]
}

function leaderSubtitle(leaderName: string | null, coLeaderName: string | null) {
  const base = leaderName ?? "Sem líder"
  return coLeaderName ? `${base} · ${coLeaderName}` : base
}

export function buildOrgGraph(orgChart: OrgChart): BuildGraphResult {
  const nodes: OrgCanvasNode[] = []
  const edges: Edge[] = []

  const pushNode = (id: string, data: OrgCanvasNodeData) => {
    nodes.push({
      id,
      type: "orgChartNode",
      position: { x: 0, y: 0 },
      data,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
  }

  const pushEdge = (source: string, target: string) => {
    edges.push({
      id: `${source}->${target}`,
      source,
      target,
      type: "smoothstep",
    })
  }

  const addSector = (
    sector: OrgChart["unassigned_sectors"][number],
    areaName: string,
    parentId: string
  ) => {
    const sectorId = `sector-${sector.id}`
    pushNode(sectorId, {
      kind: "sector",
      badge: "Setor",
      title: sector.name,
      subtitle: leaderSubtitle(sector.leader_name, sector.co_leader_name),
      childCountLabel: `${sector.life_groups.length} life group(s)`,
      unassigned: false,
      selected: { type: "sector", sector, areaName },
    })
    pushEdge(parentId, sectorId)

    for (const lifeGroup of sector.life_groups) {
      const lgId = `lg-${lifeGroup.id}`
      pushNode(lgId, {
        kind: "life_group",
        badge: "Life Group",
        title: lifeGroup.name,
        subtitle: leaderSubtitle(lifeGroup.leader_name, lifeGroup.co_leader_name),
        childCountLabel: null,
        unassigned: false,
        selected: { type: "life_group", lifeGroup, sectorName: sector.name },
      })
      pushEdge(sectorId, lgId)
    }
  }

  const addArea = (area: OrgChart["unassigned_areas"][number], rootLabel: string, parentId: string) => {
    const areaId = `area-${area.id}`
    pushNode(areaId, {
      kind: "area",
      badge: "Área",
      title: area.name,
      subtitle: leaderSubtitle(area.leader_name, area.co_leader_name),
      childCountLabel: `${area.sectors.length} setor(es)`,
      unassigned: false,
      selected: { type: "area", area, rootLabel },
    })
    pushEdge(parentId, areaId)

    for (const sector of area.sectors) {
      addSector(sector, area.name, areaId)
    }
  }

  for (const root of orgChart.roots) {
    const rootId = `root-${root.id}`
    const rootLabel = [root.pastor_name, root.co_pastor_name].filter(Boolean).join(" & ")
    pushNode(rootId, {
      kind: "root",
      badge: "Liderança Pastoral",
      title: rootLabel,
      subtitle: null,
      childCountLabel: `${root.areas.length} área(s)`,
      unassigned: false,
      selected: { type: "root", root },
    })

    for (const area of root.areas) {
      addArea(area, rootLabel, rootId)
    }
  }

  if (orgChart.unassigned_areas.length > 0) {
    const clusterId = "cluster-unassigned-areas"
    pushNode(clusterId, {
      kind: "unassigned",
      badge: "Sem pastor vinculado",
      title: "Áreas sem pastor vinculado",
      subtitle: null,
      childCountLabel: `${orgChart.unassigned_areas.length} área(s)`,
      unassigned: true,
      selected: null,
    })
    for (const area of orgChart.unassigned_areas) {
      addArea(area, "Sem pastor vinculado", clusterId)
    }
  }

  if (orgChart.unassigned_sectors.length > 0) {
    const clusterId = "cluster-unassigned-sectors"
    pushNode(clusterId, {
      kind: "unassigned",
      badge: "Setores sem área vinculada",
      title: "Setores sem área vinculada",
      subtitle: null,
      childCountLabel: `${orgChart.unassigned_sectors.length} setor(es)`,
      unassigned: true,
      selected: null,
    })
    for (const sector of orgChart.unassigned_sectors) {
      addSector(sector, "Sem área vinculada", clusterId)
    }
  }

  if (orgChart.unassigned_life_groups.length > 0) {
    const clusterId = "cluster-unassigned-life-groups"
    pushNode(clusterId, {
      kind: "unassigned",
      badge: "Life groups sem setor vinculado",
      title: "Life groups sem setor vinculado",
      subtitle: null,
      childCountLabel: `${orgChart.unassigned_life_groups.length} life group(s)`,
      unassigned: true,
      selected: null,
    })
    for (const lifeGroup of orgChart.unassigned_life_groups) {
      const lgId = `lg-${lifeGroup.id}`
      pushNode(lgId, {
        kind: "life_group",
        badge: "Life Group",
        title: lifeGroup.name,
        subtitle: leaderSubtitle(lifeGroup.leader_name, lifeGroup.co_leader_name),
        childCountLabel: null,
        unassigned: false,
        selected: {
          type: "life_group",
          lifeGroup,
          sectorName: "Sem setor vinculado",
        },
      })
      pushEdge(clusterId, lgId)
    }
  }

  return layoutGraph(nodes, edges)
}

function layoutGraph(nodes: OrgCanvasNode[], edges: Edge[]): BuildGraphResult {
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 80 })

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target)
  }

  dagre.layout(graph)

  const layoutedNodes = nodes.map((node) => {
    const position = graph.node(node.id)
    return {
      ...node,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}
