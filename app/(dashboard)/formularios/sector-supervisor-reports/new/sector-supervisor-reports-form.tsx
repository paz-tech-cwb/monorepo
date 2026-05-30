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
  sector_id: z.coerce.number().int().positive("Obrigatório"),
  area_id: z.coerce.number().int().positive().optional().nullable(),
  meetings_held: z.coerce.number().int().min(0, "Obrigatório"),
  trainings_conducted: z.coerce.number().int().min(0, "Obrigatório"),
  life_groups_visited: z.string().optional(),
  leaders_pastored: z.coerce.number().int().min(0).optional(),
  multiplication_candidates: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function SectorSupervisorReportsForm({
  defaultValues,
}: {
  defaultValues?: Partial<FormValues>
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })
  const create = useCreateFormSubmission<unknown, FormValues>("sector-supervisor-reports")
  const router = useRouter()

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        await create.mutateAsync(data)
        toast.success("Relatório enviado")
        router.push("/formularios/sector-supervisor-reports")
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
          <Label>ID do Setor *</Label>
          <Input {...register("sector_id")} type="number" />
          {errors.sector_id && <p className="text-sm text-destructive mt-1">{errors.sector_id.message}</p>}
        </div>
        <div>
          <Label>ID da Área</Label>
          <Input {...register("area_id")} type="number" />
        </div>
        <div>
          <Label>Reuniões realizadas *</Label>
          <Input {...register("meetings_held")} type="number" min={0} />
          {errors.meetings_held && <p className="text-sm text-destructive mt-1">{errors.meetings_held.message}</p>}
        </div>
        <div>
          <Label>Treinamentos realizados *</Label>
          <Input {...register("trainings_conducted")} type="number" min={0} />
          {errors.trainings_conducted && <p className="text-sm text-destructive mt-1">{errors.trainings_conducted.message}</p>}
        </div>
        <div>
          <Label>LGs visitados (IDs separados por vírgula)</Label>
          <Input {...register("life_groups_visited")} placeholder="1,2,3" />
        </div>
        <div>
          <Label>Líderes pastoreados</Label>
          <Input {...register("leaders_pastored")} type="number" min={0} />
        </div>
        <div>
          <Label>Candidatos à multiplicação</Label>
          <Input {...register("multiplication_candidates")} type="number" min={0} />
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
