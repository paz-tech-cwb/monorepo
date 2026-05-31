"use client"
import { useState, useMemo } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateInput } from "@/components/ui/date-input"
import { Textarea } from "@/components/ui/textarea"
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
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const schema = z.object({
  date: z.string().min(1, "Obrigatório"),
  sector_id: z.number({ required_error: "Obrigatório" }).int().positive(),
  area_id: z.number().int().positive().optional().nullable(),
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
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })
  const create = useCreateFormSubmission<unknown, FormValues>("sector-supervisor-reports")
  const { data: areas = [] } = useAreas()
  const { data: sectors = [] } = useSectors()
  const router = useRouter()

  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(
    defaultValues?.area_id ?? null
  )
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(
    defaultValues?.sector_id ?? null
  )

  const sortedAreas = useMemo(
    () => [...areas].sort((a, b) => a.name.localeCompare(b.name)),
    [areas]
  )

  const filteredSectors = useMemo(
    () =>
      (selectedAreaId !== null
        ? sectors.filter((s) => s.area_id === selectedAreaId)
        : sectors
      ).sort((a, b) => a.name.localeCompare(b.name)),
    [sectors, selectedAreaId]
  )

  const handleAreaChange = (value: string) => {
    const id = parseInt(value)
    setSelectedAreaId(id)
    setSelectedSectorId(null)
    setValue("area_id", id)
    setValue("sector_id", undefined as unknown as number)
  }

  const handleSectorChange = (value: string) => {
    const id = parseInt(value)
    const sector = sectors.find((s) => s.id === id)
    setSelectedSectorId(id)
    setValue("sector_id", id)
    if (sector?.area_id) {
      setSelectedAreaId(sector.area_id)
      setValue("area_id", sector.area_id)
    }
  }

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
          <Controller
            control={control}
            name="date"
            render={({ field }) => <DateInput value={field.value} onChange={field.onChange} />}
          />
          {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
        </div>

        <div>
          <Label>Área</Label>
          <Select value={selectedAreaId?.toString() ?? ""} onValueChange={handleAreaChange}>
            <SelectTrigger><SelectValue placeholder="Filtrar por área (opcional)" /></SelectTrigger>
            <SelectContent>
              {sortedAreas.map((a) => (
                <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Setor *</Label>
          <Select value={selectedSectorId?.toString() ?? ""} onValueChange={handleSectorChange}>
            <SelectTrigger><SelectValue placeholder="Selecione um setor" /></SelectTrigger>
            <SelectContent>
              {filteredSectors.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.sector_id && <p className="text-sm text-destructive mt-1">{errors.sector_id.message}</p>}
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
