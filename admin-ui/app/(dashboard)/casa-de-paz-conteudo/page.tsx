import { CasaDePazLessonsManagement } from "./casa-de-paz-lessons-management"

export default function CasaDePazConteudoPage() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Conteúdo Casa de Paz</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie o conteúdo das 4 semanas de lições da Casa de Paz.
        </p>
      </div>
      <CasaDePazLessonsManagement />
    </div>
  )
}
