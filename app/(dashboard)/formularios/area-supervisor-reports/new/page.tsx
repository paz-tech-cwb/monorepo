import { AreaSupervisorReportsForm } from "./area-supervisor-reports-form"

export default function Page() {
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Novo Relatório de Supervisor de Área</h1>
      <AreaSupervisorReportsForm />
    </div>
  )
}
