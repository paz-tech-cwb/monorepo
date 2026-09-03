"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  useFormSubmission,
  useDeleteFormSubmission,
} from "@/lib/hooks/use-form-submissions"
import type { FormSlug, FormSubmissionMeta } from "@/lib/api/types/formularios"
import { AuditLog } from "../../_components/audit-log"

const HIDDEN_KEYS = new Set([
  "id", "submitted_by", "submittedBy",
  "created_at", "createdAt",
  "updated_at", "updatedAt",
  "deleted_at", "deletedAt",
  "atmosphereTeamId",
])

const FIELD_LABELS: Record<string, string> = {
  // service-reports
  date: "Data",
  reportType: "Tipo de culto",
  period: "Período",
  atmosphereTeam: "Equipe Atmosfera",
  atmosphereTeamOther: "Outra equipe",
  atmosphereResponsible: "Responsável Atmosfera",
  tadelAdults: "Tádel — adultos",
  tadelKids: "Tádel — crianças",
  vehiclesCars: "Veículos — carros",
  vehiclesMotos: "Veículos — motos",
  vehiclesBikes: "Veículos — bikes",
  vehiclesOthers: "Veículos — outros",
  volunteersAtmosfera: "Voluntários — Atmosfera",
  volunteersLouvor: "Voluntários — Louvor",
  volunteersMiddia: "Voluntários — Mídia",
  volunteersDanca: "Voluntários — Dança",
  notes: "Observações",
  // common
  full_name: "Nome completo",
  email: "E-mail",
  phone: "Telefone",
  decision_type: "Tipo de decisão",
  offering: "Oferta",
  committed_members_present: "Membros presentes",
  guests: "Convidados",
  meetings_held: "Reuniões realizadas",
  trainings_conducted: "Treinamentos realizados",
  new_life_group_name: "Nome da nova GV",
  invited_by: "Convidado por",
}

function labelFor(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()
}

export function SubmissionDetail({
  slug,
  id,
  onClose,
}: {
  slug: FormSlug
  id: string
  onClose?: () => void
}) {
  const router = useRouter()
  const { data: submission, isLoading } = useFormSubmission<
    Record<string, unknown> & FormSubmissionMeta
  >(slug, id)
  const del = useDeleteFormSubmission(slug)

  if (isLoading) return <div className="p-6">Carregando…</div>
  if (!submission) return <div className="p-6">Não encontrado.</div>

  const createdAt = new Date((submission.created_at ?? submission.createdAt) as string)
  const canEdit = Date.now() - createdAt.getTime() < 24 * 3600_000
  const isDrawer = !!onClose

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      {!isDrawer && (
        <Button variant="ghost" asChild>
          <Link href={`/formularios/${slug}`}>
            <ArrowLeft className="size-4 mr-1" /> Voltar
          </Link>
        </Button>
      )}

      <div className="flex justify-between items-start">
        {!isDrawer && <h1 className="text-2xl font-semibold">Detalhe da submissão</h1>}
        <div className="flex gap-2 ml-auto">
          {canEdit && (
            <Button asChild>
              <Link href={`/formularios/${slug}/${id}/edit`}>Editar</Link>
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={async () => {
              if (!confirm("Excluir esta submissão?")) return
              await del.mutateAsync(id)
              toast.success("Excluído")
              if (onClose) onClose()
              else router.push(`/formularios/${slug}`)
            }}
          >
            <Trash2 className="size-4 mr-1" /> Excluir
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campos</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(submission)
              .filter(([k]) => !HIDDEN_KEYS.has(k))
              .map(([k, v]) => {
                let display: string
                if (Array.isArray(v)) {
                  display = v.join(", ") || "—"
                } else if (v !== null && typeof v === "object") {
                  display = (v as { name?: string }).name ?? JSON.stringify(v)
                } else {
                  display = String(v ?? "—")
                }
                return (
                  <div key={k}>
                    <dt className="text-xs uppercase text-muted-foreground">
                      {labelFor(k)}
                    </dt>
                    <dd className="break-words text-sm">{display}</dd>
                  </div>
                )
              })}
          </dl>
        </CardContent>
      </Card>

      <AuditLog slug={slug} id={id} />
    </div>
  )
}
