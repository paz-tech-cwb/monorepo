"use client"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateInput } from "@/components/ui/date-input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useCreateFormSubmission } from "@/lib/hooks/use-form-submissions"
import { useAtmosphereTeams } from "@/lib/hooks/use-atmosphere"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const schema = z.object({
  date: z.string().min(1, "Obrigatório"),
  report_type: z.enum(["tadel", "culto_celebracao", "evento"]),
  period: z.enum(["manha", "tarde_noite"]),
  atmosphere_team_id: z.number().int().positive().optional().nullable(),
  atmosphere_team_other: z.string().optional(),
  atmosphere_responsible: z.string().min(1, "Obrigatório"),
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
  const { register, control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })
  const create = useCreateFormSubmission<unknown, FormValues>("service-reports")
  const { data: teams = [] } = useAtmosphereTeams()
  const router = useRouter()

  const selectedTeamId = watch("atmosphere_team_id")

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        await create.mutateAsync(data)
        toast.success("Relatório enviado")
        router.push("/formularios/service-reports")
      })}
      className="space-y-6"
    >
      {/* Identificação */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Identificação</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Data *</Label>
            <Controller control={control} name="date" render={({ field }) => <DateInput value={field.value} onChange={field.onChange} />} />
            {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
          </div>
          <div>
            <Label>Tipo de relatório *</Label>
            <Controller control={control} name="report_type" render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="mt-2 space-y-1">
                <div className="flex items-center gap-2"><RadioGroupItem value="tadel" id="rt-tadel" /><Label htmlFor="rt-tadel">Tadel</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="culto_celebracao" id="rt-culto" /><Label htmlFor="rt-culto">Culto de celebração</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="evento" id="rt-evento" /><Label htmlFor="rt-evento">Evento</Label></div>
              </RadioGroup>
            )} />
          </div>
          <div>
            <Label>Período *</Label>
            <Controller control={control} name="period" render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="mt-2 space-y-1">
                <div className="flex items-center gap-2"><RadioGroupItem value="manha" id="p-manha" /><Label htmlFor="p-manha">Manhã</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="tarde_noite" id="p-tarde" /><Label htmlFor="p-tarde">Tarde/Noite</Label></div>
              </RadioGroup>
            )} />
          </div>
          <div>
            <Label>Equipe Atmosfera</Label>
            <Controller control={control} name="atmosphere_team_id" render={({ field }) => (
              <Select
                value={field.value?.toString() ?? ""}
                onValueChange={(v) => {
                  if (v === "other") {
                    setValue("atmosphere_team_id", null)
                  } else {
                    setValue("atmosphere_team_id", parseInt(v))
                    setValue("atmosphere_team_other", "")
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione a equipe" /></SelectTrigger>
                <SelectContent>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>
          {selectedTeamId === null && (
            <div>
              <Label>Outra equipe</Label>
              <Input {...register("atmosphere_team_other")} />
            </div>
          )}
          <div className="sm:col-span-2">
            <Label>Responsável pela equipe no dia *</Label>
            <Input {...register("atmosphere_responsible")} />
            {errors.atmosphere_responsible && <p className="text-sm text-destructive mt-1">{errors.atmosphere_responsible.message}</p>}
          </div>
        </div>
      </div>

      {/* Pessoas Tadel */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contabilização de pessoas Tadel</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Adultos *</Label><Input {...register("tadel_adults")} type="number" min={0} /></div>
          <div><Label>Crianças</Label><Input {...register("tadel_kids")} type="number" min={0} defaultValue={0} /></div>
        </div>
      </div>

      {/* Veículos */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contabilização de veículos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Carros *</Label><Input {...register("vehicles_cars")} type="number" min={0} /></div>
          <div><Label>Motos</Label><Input {...register("vehicles_motos")} type="number" min={0} defaultValue={0} /></div>
          <div><Label>Bicicletas</Label><Input {...register("vehicles_bikes")} type="number" min={0} defaultValue={0} /></div>
          <div><Label>Outros</Label><Input {...register("vehicles_others")} placeholder="Ex: Ônibus - 2" /></div>
        </div>
      </div>

      {/* Voluntários */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contabilização de voluntários</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Atmosfera</Label><Input {...register("volunteers_atmosfera")} type="number" min={0} defaultValue={0} /></div>
          <div><Label>Louvor</Label><Input {...register("volunteers_louvor")} type="number" min={0} defaultValue={0} /></div>
          <div><Label>Mídia</Label><Input {...register("volunteers_midia")} type="number" min={0} defaultValue={0} /></div>
          <div><Label>Dança</Label><Input {...register("volunteers_danca")} type="number" min={0} defaultValue={0} /></div>
        </div>
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informações gerais</h3>
        <div>
          <Label>Observação</Label>
          <Textarea {...register("notes")} placeholder="Ocorrências durante o serviço, materiais faltando, danos..." />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>Salvar</Button>
    </form>
  )
}
