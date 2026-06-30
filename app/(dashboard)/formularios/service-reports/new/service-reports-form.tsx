"use client"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePickerInput } from "@/components/ui/date-picker-input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useCreateFormSubmission } from "@/lib/hooks/use-form-submissions"
import { useMinistries } from "@/lib/hooks/use-ministries"
import { useAuth } from "@/lib/hooks/use-auth"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"

const schema = z.object({
  date: z.string().min(1, "Obrigatório"),
  report_type: z.enum(["tadel", "culto_celebracao", "evento"]),
  period: z.enum(["manha", "tarde_noite"]),
  atmosphere_team_id: z.number().int().positive().optional().nullable(),
  tadel_adults: z.coerce.number().int().min(0),
  tadel_kids: z.coerce.number().int().min(0).optional(),
  vehicles_cars: z.coerce.number().int().min(0),
  vehicles_motos: z.coerce.number().int().min(0).optional(),
  vehicles_bikes: z.coerce.number().int().min(0).optional(),
  vehicles_others: z.string().optional(),
  volunteers_atmosfera: z.coerce.number().int().min(0).optional(),
  volunteers_louvor: z.coerce.number().int().min(0).optional(),
  volunteers_midia: z.coerce.number().int().min(0).optional(),
  volunteers_danca: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function ServiceReportsForm({ defaultValues }: { defaultValues?: Partial<FormValues> }) {
  const todayIso = format(new Date(), "yyyy-MM-dd")
  const { user } = useAuth()
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        date: todayIso,
        report_type: "tadel",
        period: "manha",
        tadel_adults: 0,
        tadel_kids: 0,
        vehicles_cars: 0,
        vehicles_motos: 0,
        vehicles_bikes: 0,
        volunteers_atmosfera: 0,
        volunteers_louvor: 0,
        volunteers_midia: 0,
        volunteers_danca: 0,
        ...defaultValues,
      },
    })
  const create = useCreateFormSubmission<unknown, FormValues & { atmosphere_responsible: string }>("service-reports")
  const { data: ministries = [] } = useMinistries()
  const router = useRouter()

  const atmosfera = ministries.find((m) => m.slug === "atmosfera")
  const atmosferaTeams = atmosfera?.teams ?? []

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        await create.mutateAsync({
          ...data,
          atmosphere_responsible: user?.name ?? "",
        })
        toast.success("Relatório enviado")
        router.push("/formularios/service-reports")
      })}
      className="space-y-6"
    >
      {/* Identificação */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Identificação</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Data *</Label>
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <DatePickerInput value={field.value} onChange={field.onChange} className="w-full" />
              )}
            />
            {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de relatório *</Label>
            <Controller control={control} name="report_type" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tadel">Tadel</SelectItem>
                  <SelectItem value="culto_celebracao">Culto de celebração</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-1.5">
            <Label>Período *</Label>
            <Controller control={control} name="period" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manha">Manhã</SelectItem>
                  <SelectItem value="tarde_noite">Tarde/Noite</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-1.5">
            <Label>Equipe Atmosfera</Label>
            <Controller control={control} name="atmosphere_team_id" render={({ field }) => (
              <Select
                value={field.value?.toString() ?? ""}
                onValueChange={(v) => field.onChange(v ? parseInt(v) : null)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione a equipe" /></SelectTrigger>
                <SelectContent>
                  {atmosferaTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </div>
        </div>
      </div>

      {/* Pessoas */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contabilização de pessoas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Adultos *</Label><Input {...register("tadel_adults")} type="number" min={0} /></div>
          <div className="space-y-1.5"><Label>Crianças</Label><Input {...register("tadel_kids")} type="number" min={0} defaultValue={0} /></div>
        </div>
      </div>

      {/* Veículos */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contabilização de veículos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Carros *</Label><Input {...register("vehicles_cars")} type="number" min={0} /></div>
          <div className="space-y-1.5"><Label>Motos</Label><Input {...register("vehicles_motos")} type="number" min={0} defaultValue={0} /></div>
          <div className="space-y-1.5"><Label>Bicicletas</Label><Input {...register("vehicles_bikes")} type="number" min={0} defaultValue={0} /></div>
          <div className="space-y-1.5"><Label>Outros</Label><Input {...register("vehicles_others")} placeholder="Ex: Ônibus - 2" /></div>
        </div>
      </div>

      {/* Voluntários */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contabilização de voluntários</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Atmosfera</Label><Input {...register("volunteers_atmosfera")} type="number" min={0} defaultValue={0} /></div>
          <div className="space-y-1.5"><Label>Louvor</Label><Input {...register("volunteers_louvor")} type="number" min={0} defaultValue={0} /></div>
          <div className="space-y-1.5"><Label>Mídia</Label><Input {...register("volunteers_midia")} type="number" min={0} defaultValue={0} /></div>
          <div className="space-y-1.5"><Label>Dança</Label><Input {...register("volunteers_danca")} type="number" min={0} defaultValue={0} /></div>
        </div>
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informações gerais</h3>
        <div className="space-y-1.5">
          <Label>Observação</Label>
          <Textarea {...register("notes")} placeholder="Ocorrências durante o serviço, materiais faltando, danos..." />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>Salvar</Button>
    </form>
  )
}
