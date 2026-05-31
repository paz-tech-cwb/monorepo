"use client"
import { useState, useMemo } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateInput } from "@/components/ui/date-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateFormSubmission } from "@/lib/hooks/use-form-submissions"
import { useAreas } from "@/lib/hooks/use-areas"
import { useSectors } from "@/lib/hooks/use-sectors"
import { useLifeGroups } from "@/lib/hooks/use-life-groups"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const schema = z.object({
  date: z.string().min(1, "Obrigatório"),
  area_id: z.number({ required_error: "Obrigatório" }).int().positive(),
  sector_id: z.number({ required_error: "Obrigatório" }).int().positive(),
  life_group_id: z.number({ required_error: "Obrigatório" }).int().positive(),
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
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })
  const create = useCreateFormSubmission<unknown, FormValues>("life-group-reports")
  const { data: areas = [] } = useAreas()
  const { data: sectors = [] } = useSectors()
  const { data: lifeGroups = [] } = useLifeGroups()
  const router = useRouter()

  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(
    defaultValues?.area_id ?? null
  )
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(
    defaultValues?.sector_id ?? null
  )
  const [selectedLifeGroupId, setSelectedLifeGroupId] = useState<number | null>(
    defaultValues?.life_group_id ?? null
  )

  const sortedAreas = useMemo(
    () => [...areas].sort((a, b) => a.name.localeCompare(b.name)),
    [areas]
  )

  const filteredSectors = useMemo(
    () =>
      sectors
        .filter((s) => s.area_id === selectedAreaId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [sectors, selectedAreaId]
  )

  const filteredLifeGroups = useMemo(
    () =>
      lifeGroups
        .filter((lg) => lg.sector_id === selectedSectorId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [lifeGroups, selectedSectorId]
  )

  const handleAreaChange = (value: string) => {
    const id = parseInt(value)
    setSelectedAreaId(id)
    setSelectedSectorId(null)
    setSelectedLifeGroupId(null)
    setValue("area_id", id)
    setValue("sector_id", undefined as unknown as number)
    setValue("life_group_id", undefined as unknown as number)
  }

  const handleSectorChange = (value: string) => {
    const id = parseInt(value)
    const sector = sectors.find((s) => s.id === id)
    setSelectedSectorId(id)
    setSelectedLifeGroupId(null)
    setValue("sector_id", id)
    setValue("life_group_id", undefined as unknown as number)
    if (sector?.area_id && !selectedAreaId) {
      setSelectedAreaId(sector.area_id)
      setValue("area_id", sector.area_id)
    }
  }

  const handleLifeGroupChange = (value: string) => {
    const id = parseInt(value)
    const lg = lifeGroups.find((g) => g.id === id)
    if (!lg) return
    setSelectedLifeGroupId(id)
    setValue("life_group_id", id)
    if (lg.sector_id && !selectedSectorId) {
      const sector = sectors.find((s) => s.id === lg.sector_id)
      setSelectedSectorId(lg.sector_id)
      setValue("sector_id", lg.sector_id)
      if (sector?.area_id && !selectedAreaId) {
        setSelectedAreaId(sector.area_id)
        setValue("area_id", sector.area_id)
      }
    }
  }

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
          <Controller
            control={control}
            name="date"
            render={({ field }) => <DateInput value={field.value} onChange={field.onChange} />}
          />
          {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
        </div>

        <div>
          <Label>Área *</Label>
          <Select value={selectedAreaId?.toString() ?? ""} onValueChange={handleAreaChange}>
            <SelectTrigger><SelectValue placeholder="Selecione uma área" /></SelectTrigger>
            <SelectContent>
              {sortedAreas.map((a) => (
                <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.area_id && <p className="text-sm text-destructive mt-1">{errors.area_id.message}</p>}
        </div>

        <div>
          <Label>Setor *</Label>
          <Select
            value={selectedSectorId?.toString() ?? ""}
            onValueChange={handleSectorChange}
            disabled={selectedAreaId === null}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedAreaId === null ? "Selecione uma área primeiro" : "Selecione um setor"} />
            </SelectTrigger>
            <SelectContent>
              {filteredSectors.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.sector_id && <p className="text-sm text-destructive mt-1">{errors.sector_id.message}</p>}
        </div>

        <div>
          <Label>Life Group *</Label>
          <Select
            value={selectedLifeGroupId?.toString() ?? ""}
            onValueChange={handleLifeGroupChange}
            disabled={selectedSectorId === null}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedSectorId === null ? "Selecione um setor primeiro" : "Selecione um Life Group"} />
            </SelectTrigger>
            <SelectContent>
              {filteredLifeGroups.map((lg) => (
                <SelectItem key={lg.id} value={lg.id.toString()}>{lg.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
