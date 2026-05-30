"use client"
import { useParams, useRouter } from "next/navigation"
import { useFormSubmission, useUpdateFormSubmission } from "@/lib/hooks/use-form-submissions"
import type { FormSlug } from "@/lib/api/types/formularios"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function EditPage() {
  const params = useParams<{ slug: string; id: string }>()
  const slug = params.slug as FormSlug
  const id = params.id
  const router = useRouter()
  const { data: submission, isLoading } = useFormSubmission<Record<string, unknown>>(slug, id)
  const update = useUpdateFormSubmission<unknown, Record<string, unknown>>(slug)

  if (isLoading) return <div className="p-6">Carregando…</div>
  if (!submission) return <div className="p-6">Não encontrado.</div>

  // Full edit for form-guests is handled via inline form; other slugs show stub
  if (slug === "form-guests") {
    return (
      <FormGuestsEditShell
        id={id}
        slug={slug}
        submission={submission}
        onSave={async (data) => {
          await update.mutateAsync({ id, payload: data })
          toast.success("Atualizado")
          router.push(`/formularios/${slug}/${id}`)
        }}
      />
    )
  }

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Button variant="ghost" asChild>
        <Link href={`/formularios/${slug}/${id}`}>
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold">Editar (em construção)</h1>
      <p className="text-muted-foreground text-sm">
        A edição para este tipo de formulário estará disponível em breve.
      </p>
    </div>
  )
}

// Inline edit shell for form-guests to avoid cross-dynamic-segment imports
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const guestSchema = z.object({
  full_name: z.string().min(2, "Obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().regex(/^\+?[0-9]{8,15}$/, "Formato: +5511999999999"),
  address: z.string().optional(),
  invited_by: z.string().min(1, "Obrigatório"),
  how_met_church: z.string().optional(),
  notes: z.string().optional(),
})
type GuestValues = z.infer<typeof guestSchema>

function FormGuestsEditShell({
  id,
  slug,
  submission,
  onSave,
}: {
  id: string
  slug: string
  submission: Record<string, unknown>
  onSave: (data: GuestValues) => Promise<void>
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GuestValues>({
    resolver: zodResolver(guestSchema),
    defaultValues: submission as Partial<GuestValues>,
  })

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Button variant="ghost" asChild>
        <Link href={`/formularios/${slug}/${id}`}>
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold">Editar Convidado</h1>
      <form onSubmit={handleSubmit(onSave)} className="space-y-4">
        <div>
          <Label>Nome completo *</Label>
          <Input {...register("full_name")} />
          {errors.full_name && <p className="text-sm text-destructive mt-1">{errors.full_name.message}</p>}
        </div>
        <div>
          <Label>E-mail</Label>
          <Input {...register("email")} />
        </div>
        <div>
          <Label>WhatsApp *</Label>
          <Input {...register("phone")} placeholder="+5511999999999" />
          {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
        </div>
        <div>
          <Label>Endereço</Label>
          <Input {...register("address")} />
        </div>
        <div>
          <Label>Convidado por *</Label>
          <Input {...register("invited_by")} />
          {errors.invited_by && <p className="text-sm text-destructive mt-1">{errors.invited_by.message}</p>}
        </div>
        <div>
          <Label>Como conheceu a igreja</Label>
          <Input {...register("how_met_church")} />
        </div>
        <div>
          <Label>Observações</Label>
          <Textarea {...register("notes")} />
        </div>
        <Button type="submit" disabled={isSubmitting}>
          Salvar
        </Button>
      </form>
    </div>
  )
}
