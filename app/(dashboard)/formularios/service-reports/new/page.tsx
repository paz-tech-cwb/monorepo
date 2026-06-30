"use client"
import { useAuth } from "@/lib/hooks/use-auth"
import { useMinistries } from "@/lib/hooks/use-ministries"
import { ServiceReportsForm } from "./service-reports-form"

export default function Page() {
  const { user } = useAuth()
  const { data: ministries = [] } = useMinistries()

  const atmosfera = ministries.find((m) => m.slug === "atmosfera")
  const isAdmin = user?.role === "admin"
  const isAtmosphereLeader =
    atmosfera?.leader?.id === user?.id || atmosfera?.co_leader?.id === user?.id
  const isAtmosphereTeamMember = atmosfera?.teams.some(
    (t) => t.members?.some((m) => m.id === user?.id)
  ) ?? false

  const hasAccess = isAdmin || isAtmosphereLeader || isAtmosphereTeamMember

  if (!hasAccess && user) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Você não tem permissão para acessar este formulário.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Novo Relatório de Culto</h1>
      <ServiceReportsForm />
    </div>
  )
}
