import { CasaDePazRegistrosManagement } from "./casa-de-paz-registros-management"

export default function CasaDePazRegistrosPage() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Registros Casa de Paz</h1>
        <p className="text-sm text-muted-foreground">
          Consulte, edite e remova os registros enviados de Casa de Paz.
        </p>
      </div>
      <CasaDePazRegistrosManagement />
    </div>
  )
}
