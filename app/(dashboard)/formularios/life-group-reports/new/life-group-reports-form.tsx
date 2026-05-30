"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateFormSubmission } from "@/lib/hooks/use-form-submissions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const schema = z.object({
  date: z.string().min(1, "Obrigatório"),
  area_id: z.coerce.number().int().positive("Obrigatório"),
  sector_id: z.coerce.number().int().positive("Obrigatório"),
  life_group_id: z.coerce.number().int().positive("Obrigatório"),
  committed_members: z.coerce.number().int().min(0, "Obrigatório"),
  committed_members_present: z.coerce.number().int().min(0, "Obrigatório"),
  kids_0_to_11: z.coerce.number().int().min(0),
  guests: z.coerce.number().int().min(0),
  mdas: z.coerce.number().int().min(0),
  offering: z.string().min(1, "Obrigatório"),
  committed_at_tadel: z.coerce.number().int().min(0),
  committed_at_culto: z.coerce.number().int().min(0),
  disciples_count: z.coerce.number().int().min(0),
  disciples_discipled_this_week: z.coerce.number().int().min(0),
  pastoring_activity_type: z.string().min(1, "Obrigatório"),
  training_activity_type: z.string().min(1, "Obrigatório"),
})
type FormValues = z.infer<typeof schema>

export function LifeGroupReportsForm({ defaultValues }: { defaultValues?: Partial<FormValues> }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })
  const create = useCreateFormSubmission<unknown, FormValues>("life-group-reports")
  const router = useRouter()

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        await create.mutateAsync(data)
        toast.success("Relatório enviado")
        router.push("/formularios/life-group-reports")
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
          <Label>ID do Setor *</Label>
          <Input {...register("sector_id")} type="number" />
          {errors.sector_id && <p className="text-sm text-destructive mt-1">{errors.sector_id.message}</p>}
        </div>
        <div>
          <Label>ID do Life Group *</Label>
          <Input {...register("life_group_id")} type="number" />
          {errors.life_group_id && <p className="text-sm text-destructive mt-1">{errors.life_group_id.message}</p>}
        </div>
        <div>
          <Label>Comprometidos *</Label>
          <Input {...register("committed_members")} type="number" min={0} />
          {errors.committed_members && <p className="text-sm text-destructive mt-1">{errors.committed_members.message}</p>}
        </div>
        <div>
          <Label>Comprometidos presentes *</Label>
          <Input {...register("committed_members_present")} type="number" min={0} />
          {errors.committed_members_present && <p className="text-sm text-destructive mt-1">{errors.committed_members_present.message}</p>}
        </div>
        <div>
          <Label>Crianças (0-11)</Label>
          <Input {...register("kids_0_to_11")} type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label>Convidados</Label>
          <Input {...register("guests")} type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label>MDAs</Label>
          <Input {...register("mdas")} type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label>Oferta *</Label>
          <Input {...register("offering")} placeholder="0.00" />
          {errors.offering && <p className="text-sm text-destructive mt-1">{errors.offering.message}</p>}
        </div>
        <div>
          <Label>Comprometidos no Tadel</Label>
          <Input {...register("committed_at_tadel")} type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label>Comprometidos no culto</Label>
          <Input {...register("committed_at_culto")} type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label>Discípulos</Label>
          <Input {...register("disciples_count")} type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label>Discipulados esta semana</Label>
          <Input {...register("disciples_discipled_this_week")} type="number" min={0} defaultValue={0} />
        </div>
        <div>
          <Label>Tipo atividade pastoreio *</Label>
          <Input {...register("pastoring_activity_type")} />
          {errors.pastoring_activity_type && <p className="text-sm text-destructive mt-1">{errors.pastoring_activity_type.message}</p>}
        </div>
        <div>
          <Label>Tipo atividade treinamento *</Label>
          <Input {...register("training_activity_type")} />
          {errors.training_activity_type && <p className="text-sm text-destructive mt-1">{errors.training_activity_type.message}</p>}
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Salvar
      </Button>
    </form>
  )
}
