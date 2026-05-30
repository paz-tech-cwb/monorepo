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

export function SubmissionDetail({ slug, id }: { slug: FormSlug; id: string }) {
  const router = useRouter()
  const { data: submission, isLoading } = useFormSubmission<
    Record<string, unknown> & FormSubmissionMeta
  >(slug, id)
  const del = useDeleteFormSubmission(slug)

  if (isLoading) return <div className="p-6">Carregando…</div>
  if (!submission) return <div className="p-6">Não encontrado.</div>

  const createdAt = new Date(submission.created_at)
  const canEdit = Date.now() - createdAt.getTime() < 24 * 3600_000

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <Button variant="ghost" asChild>
        <Link href={`/formularios/${slug}`}>
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Link>
      </Button>

      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-semibold">Detalhe da submissão</h1>
        <div className="flex gap-2">
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
              router.push(`/formularios/${slug}`)
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
              .filter(
                ([k]) =>
                  !["id", "submitted_by", "created_at", "updated_at", "deleted_at"].includes(k)
              )
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase text-muted-foreground">
                    {k.replace(/_/g, " ")}
                  </dt>
                  <dd className="break-words text-sm">
                    {Array.isArray(v) ? v.join(", ") : String(v ?? "—")}
                  </dd>
                </div>
              ))}
          </dl>
        </CardContent>
      </Card>

      <AuditLog slug={slug} id={id} />
    </div>
  )
}
