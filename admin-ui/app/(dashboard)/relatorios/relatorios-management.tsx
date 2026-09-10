"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Users2 } from "lucide-react"
import { LifeGroupsReport } from "./life-groups-report"

// Report catalog — add an entry here whenever a new report type is built.
// The selector and the switch below stay in sync with this single list.
const REPORT_TYPES = [
  { value: "life-groups", label: "Grupos de Vida", icon: Users2 },
] as const

type ReportType = (typeof REPORT_TYPES)[number]["value"]

export function RelatoriosManagement() {
  const [reportType, setReportType] = useState<ReportType>("life-groups")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Estatísticas e relatórios detalhados da igreja</p>
        </div>
        <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Selecione um relatório" />
          </SelectTrigger>
          <SelectContent>
            {REPORT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <type.icon className="h-4 w-4" />
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {reportType === "life-groups" && <LifeGroupsReport />}
    </div>
  )
}
