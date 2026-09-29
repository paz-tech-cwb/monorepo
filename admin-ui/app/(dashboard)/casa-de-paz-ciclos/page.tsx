import { CasaDePazCyclesManagement } from "./casa-de-paz-cycles-management"

export default function CasaDePazCiclosPage() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Ciclos Casa de Paz</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie os ciclos mensais usados para agrupar os relatórios de Casa de Paz.
        </p>
      </div>
      <CasaDePazCyclesManagement />
    </div>
  )
}
