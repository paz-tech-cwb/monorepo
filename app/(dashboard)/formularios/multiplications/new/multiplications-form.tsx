"use client"
import { useState, useMemo } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AddressForm, EMPTY_ADDRESS, addressFormDataToLine, type AddressFormData } from "@/components/ui/address-form"
import { PhoneInput } from "@/components/ui/phone-input"
import { DatePickerInput } from "@/components/ui/date-picker-input"
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
  source_life_group_id: z.number({ required_error: "Obrigatório" }).int().positive(),
  area_id: z.number({ required_error: "Obrigatório" }).int().positive(),
  sector_id: z.number({ required_error: "Obrigatório" }).int().positive(),
  new_life_group_name: z.string().min(1, "Obrigatório"),
  new_leader_id: z.number({ required_error: "Obrigatório" }).int().positive(),
  host_id: z.coerce.number().int().positive("Obrigatório"),
  address: z.string().min(1, "Obrigatório"),
  leader_phone: z.string().regex(/^\+55[0-9]{10,11}$/, "Telefone inválido"),
  meeting_day_time: z.string().min(1, "Obrigatório"),
  completed_leadership_track: z.boolean().optional(),
  legally_married: z.boolean().optional(),
  faithful_tither: z.boolean().optional(),
  evangelizing_and_consolidating: z.boolean().optional(),
  good_testimony: z.boolean().optional(),
  single_living_in_purity: z.boolean().optional(),
  new_life_group_id: z.number().int().positive().optional().nullable(),
  members_to_move: z.string().optional(),
  new_members: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const CHECKBOXES: { key: keyof FormValues; label: string }[] = [
  { key: "completed_leadership_track", label: "Concluiu trilha de liderança" },
  { key: "legally_married", label: "Casado(a) legalmente" },
  { key: "faithful_tither", label: "Dizimista fiel" },
  { key: "evangelizing_and_consolidating", label: "Evangelizando e consolidando" },
  { key: "good_testimony", label: "Bom testemunho" },
  { key: "single_living_in_purity", label: "Solteiro(a) vivendo em pureza" },
]

export function MultiplicationsForm({ defaultValues }: { defaultValues?: Partial<FormValues> }) {
  const todayIso = new Date().toISOString().slice(0, 10)
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: todayIso,
      completed_leadership_track: false,
      legally_married: false,
      faithful_tither: false,
      evangelizing_and_consolidating: false,
      good_testimony: false,
      single_living_in_purity: false,
      ...defaultValues,
    },
  })
  const create = useCreateFormSubmission<unknown, FormValues>("multiplications")
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
  const [selectedSourceLgId, setSelectedSourceLgId] = useState<number | null>(
    defaultValues?.source_life_group_id ?? null
  )
  const [selectedNewLeaderId, setSelectedNewLeaderId] = useState<number | null>(
    defaultValues?.new_leader_id ?? null
  )
  const [selectedNewLgId, setSelectedNewLgId] = useState<number | null>(
    defaultValues?.new_life_group_id ?? null
  )
  const [addressValue, setAddressValue] = useState<AddressFormData>(EMPTY_ADDRESS)

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

  const filteredLifeGroups = useMemo(
    () =>
      lifeGroups
        .filter((lg) => lg.sector_id === selectedSectorId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [lifeGroups, selectedSectorId]
  )

  const allLeaders = useMemo(() => {
    const seen = new Map<number, string>()
    for (const lg of lifeGroups) {
      if (lg.leader_id != null && lg.leader_name && !seen.has(lg.leader_id)) {
        seen.set(lg.leader_id, lg.leader_name)
      }
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [lifeGroups])

  const handleAreaChange = (value: string) => {
    const id = parseInt(value)
    setSelectedAreaId(id)
    setSelectedSectorId(null)
    setSelectedSourceLgId(null)
    setSelectedNewLgId(null)
    setValue("area_id", id)
    setValue("sector_id", undefined as unknown as number)
    setValue("source_life_group_id", undefined as unknown as number)
    setValue("new_life_group_id", null)
  }

  const handleSectorChange = (value: string) => {
    const id = parseInt(value)
    const sector = sectors.find((s) => s.id === id)
    setSelectedSectorId(id)
    setSelectedSourceLgId(null)
    setSelectedNewLgId(null)
    setValue("sector_id", id)
    setValue("source_life_group_id", undefined as unknown as number)
    setValue("new_life_group_id", null)
    if (sector?.area_id && !selectedAreaId) {
      setSelectedAreaId(sector.area_id)
      setValue("area_id", sector.area_id)
    }
  }

  const handleSourceLgChange = (value: string) => {
    const id = parseInt(value)
    const lg = lifeGroups.find((g) => g.id === id)
    if (!lg) return
    setSelectedSourceLgId(id)
    setValue("source_life_group_id", id)
    if (lg.sector_id && !selectedSectorId) {
      const sector = sectors.find((s) => s.id === lg.sector_id)
      setSelectedSectorId(lg.sector_id)
      setValue("sector_id", lg.sector_id)
      if (sector?.area_id && !selectedAreaId) {
        setSelectedAreaId(sector.area_id)
        setValue("area_id", sector.area_id)
      }
    }
    if (lg.leader_id != null) {
      setSelectedNewLeaderId(lg.leader_id)
      setValue("new_leader_id", lg.leader_id)
    }
  }

  const handleNewLeaderChange = (value: string) => {
    const id = parseInt(value)
    setSelectedNewLeaderId(id)
    setValue("new_leader_id", id)
  }

  const handleNewLgChange = (value: string) => {
    const id = parseInt(value)
    setSelectedNewLgId(id)
    setValue("new_life_group_id", id)
  }

  const handleAddressChange = (address: AddressFormData) => {
    setAddressValue(address)
    setValue("address", addressFormDataToLine(address))
  }

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        await create.mutateAsync(data)
        toast.success("Multiplicação registrada")
        router.push("/formularios/multiplications")
      })}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Controller
            control={control}
            name="date"
            render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} className="w-full" />}
          />
          {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
        </div>

        <div className="space-y-1.5">
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

        <div className="space-y-1.5">
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

        <div className="space-y-1.5">
          <Label>LG de origem *</Label>
          <Select
            value={selectedSourceLgId?.toString() ?? ""}
            onValueChange={handleSourceLgChange}
            disabled={selectedSectorId === null}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedSectorId === null ? "Selecione um setor primeiro" : "Selecione o LG de origem"} />
            </SelectTrigger>
            <SelectContent>
              {filteredLifeGroups.map((lg) => (
                <SelectItem key={lg.id} value={lg.id.toString()}>{lg.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.source_life_group_id && <p className="text-sm text-destructive mt-1">{errors.source_life_group_id.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Nome do novo LG *</Label>
          <Input {...register("new_life_group_name")} />
          {errors.new_life_group_name && <p className="text-sm text-destructive mt-1">{errors.new_life_group_name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Novo líder *</Label>
          <Select value={selectedNewLeaderId?.toString() ?? ""} onValueChange={handleNewLeaderChange}>
            <SelectTrigger><SelectValue placeholder="Selecione um líder" /></SelectTrigger>
            <SelectContent>
              {allLeaders.map((l) => (
                <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.new_leader_id && <p className="text-sm text-destructive mt-1">{errors.new_leader_id.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>ID do anfitrião *</Label>
          <Input {...register("host_id")} type="number" />
          {errors.host_id && <p className="text-sm text-destructive mt-1">{errors.host_id.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Telefone do líder *</Label>
          <Controller
            control={control}
            name="leader_phone"
            render={({ field }) => <PhoneInput value={field.value} onChange={field.onChange} />}
          />
          {errors.leader_phone && <p className="text-sm text-destructive mt-1">{errors.leader_phone.message}</p>}
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Endereço *</Label>
          <AddressForm value={addressValue} onChange={handleAddressChange} idPrefix="multiplication-" required />
          {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Dia e horário da reunião *</Label>
          <Input {...register("meeting_day_time")} type="datetime-local" />
          {errors.meeting_day_time && <p className="text-sm text-destructive mt-1">{errors.meeting_day_time.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Novo LG (se já criado)</Label>
          <Select
            value={selectedNewLgId?.toString() ?? ""}
            onValueChange={handleNewLgChange}
            disabled={selectedSectorId === null}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione (opcional)" />
            </SelectTrigger>
            <SelectContent>
              {filteredLifeGroups.map((lg) => (
                <SelectItem key={lg.id} value={lg.id.toString()}>{lg.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Membros a transferir (IDs, vírgula)</Label>
          <Input {...register("members_to_move")} />
        </div>
        <div className="space-y-1.5">
          <Label>Novos membros (nomes, vírgula)</Label>
          <Input {...register("new_members")} />
        </div>
      </div>

      <h3 className="font-medium pt-2">Critérios do líder</h3>
      <div className="flex flex-wrap gap-4">
        {CHECKBOXES.map(({ key, label }) => (
          <div key={key} className="flex items-center">
            <Checkbox
              id={key}
              checked={!!watch(key as never)}
              onCheckedChange={(checked) =>
                setValue(key as never, checked as never)
              }
            />
            <Label htmlFor={key} className="ml-2 font-normal">
              {label}
            </Label>
          </div>
        ))}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        Salvar
      </Button>
    </form>
  )
}
