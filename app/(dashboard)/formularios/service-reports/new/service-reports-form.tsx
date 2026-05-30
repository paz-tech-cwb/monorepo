"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCreateFormSubmission } from "@/lib/hooks/use-form-submissions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const schema = z.object({
  date: z.string().min(1, "Obrigatório"),
  service_type: z.string().min(1, "Obrigatório"),
  service_type_other: z.string().optional(),
  total_attendance: z.coerce.number().int().min(0, "Obrigatório"),
  members_present: z.coerce.number().int().min(0, "Obrigatório"),
  guests_present: z.coerce.number().int().min(0),
  kids_present: z.coerce.number().int().min(0),
  decisions_for_christ: z.coerce.number().int().min(0),
  reconciliations: z.coerce.number().int().min(0),
  offering: z.string().min(1, "Obrigatório"),
  baptism_candidates: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function ServiceReportsForm({ defaultValues }: { defaultValues?: Partial<FormValues> }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })
  const create = useCreateFormSubmission<unknown, FormValues>("service-reports")
  const router = useRouter()

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        await create.mutateAsync(data)
        toast.success("Relatório enviado")
        router.push("/formularios/service-reports")
      })}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Data *</Label>
          <Input {...register("date")} type="date" />
          {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
        </div>
        <div>
          <Label>Tipo de culto *</Label>
          <Input {...register("service_type")} placeholder="Ex: Domingo, Célula..." />
          {errors.service_type && <p className="text-sm text-destructive mt-1">{errors.service_type.message}</p>}
        </div>
        <div>
          <Label>Especifique (se outro)</Label>
          <Input {...register("service_type_other")} />
        </div>
        <div>
          <Label>Total de presentes *</Label>
          <Input {...register("total_attendance")} type="number" min={0} />
          {errors.total_attendance && <p className="text-sm text-destructive mt-1">{errors.total_attendance.message}</p>}
        </div>
        <div>
          <Label>Membros presentes *</Label>
          <Input {...register("members_present")} type="number" min={0} />
          {errors.members_present && <p className="text-sm text-destructive mt-1">{errors.members_present.message}</p>}
        </div>
        <div>
          <Label>Convidados presentes</Label>
          <Input {...register("guests_present")} type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label>Crianças presentes</Label>
          <Input {...register("kids_present")} type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label>Decisões por Cristo</Label>
          <Input {...register("decisions_for_christ")} type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label>Reconciliações</Label>
          <Input {...register("reconciliations")} type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label>Oferta *</Label>
          <Input {...register("offering")} placeholder="0.00" />
          {errors.offering && <p className="text-sm text-destructive mt-1">{errors.offering.message}</p>}
        </div>
        <div>
          <Label>Candidatos ao batismo</Label>
          <Input {...register("baptism_candidates")} type="number" min={0} />
        </div>
      </div>
      <div>
        <Label>Observações</Label>
        <Textarea {...register("notes")} />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Salvar
      </Button>
    </form>
  )
}
