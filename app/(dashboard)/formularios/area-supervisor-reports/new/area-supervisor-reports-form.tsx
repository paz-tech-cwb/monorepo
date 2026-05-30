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
  area_id: z.coerce.number().int().positive("Obrigatório"),
  meetings_held: z.coerce.number().int().min(0, "Obrigatório"),
  trainings_conducted: z.coerce.number().int().min(0, "Obrigatório"),
  sectors_visited: z.string().optional(),
  sector_leaders_pastored: z.coerce.number().int().min(0).optional(),
  multiplications_in_progress: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function AreaSupervisorReportsForm({
  defaultValues,
}: {
  defaultValues?: Partial<FormValues>
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })
  const create = useCreateFormSubmission<unknown, FormValues>("area-supervisor-reports")
  const router = useRouter()

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        await create.mutateAsync(data)
        toast.success("Relatório enviado")
        router.push("/formularios/area-supervisor-reports")
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
          <Label>ID da Área *</Label>
          <Input {...register("area_id")} type="number" />
          {errors.area_id && <p className="text-sm text-destructive mt-1">{errors.area_id.message}</p>}
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
          <Label>Setores visitados</Label>
          <Input {...register("sectors_visited")} placeholder="IDs separados por vírgula" />
        </div>
        <div>
          <Label>Supervisores de setor pastoreados</Label>
          <Input {...register("sector_leaders_pastored")} type="number" min={0} />
        </div>
        <div>
          <Label>Multiplicações em andamento</Label>
          <Input {...register("multiplications_in_progress")} type="number" min={0} />
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
