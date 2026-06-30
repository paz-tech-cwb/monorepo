"use client"
import { useEffect, useState, useMemo } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useFormCourses } from "@/lib/hooks/use-form-courses"
import { useSectors } from "@/lib/hooks/use-sectors"
import { useLifeGroups } from "@/lib/hooks/use-life-groups"
import { lookupCep } from "@/lib/api/endpoints/cep"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  full_name: z.string().min(2, "Obrigatório"),
  birth_date: z.string().min(1, "Obrigatório"),
  phone: z.string().regex(/^\+55[0-9]{10,11}$/, "Telefone inválido"),
  gender: z.enum(["m", "f"], { required_error: "Obrigatório" }),
  civil_state: z.string().min(1, "Obrigatório"),
  sector_id: z.number({ required_error: "Obrigatório" }).int().positive(),
  life_group_id: z.number().int().positive().optional().nullable(),
  leader_id: z.number().int().positive().optional().nullable(),
  cep: z.string().optional(),
  street: z.string().optional(),
  address_number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  address: z.string().optional(),
  completed_courses: z.array(z.string()).optional(),
})
type FormValues = z.infer<typeof schema>

export function MemberRegistrationsForm({ defaultValues }: { defaultValues?: Partial<FormValues> }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { completed_courses: [], ...defaultValues },
  })
  const create = useCreateFormSubmission<unknown, FormValues>("member-registrations")
  const { data: courses = [] } = useFormCourses()
  const { data: sectors = [] } = useSectors()
  const { data: lifeGroups = [] } = useLifeGroups()
  const router = useRouter()
  const cepValue = watch("cep")

  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(
    defaultValues?.sector_id ?? null
  )
  const [selectedLifeGroupId, setSelectedLifeGroupId] = useState<number | null>(
    defaultValues?.life_group_id ?? null
  )
  const [selectedLeaderId, setSelectedLeaderId] = useState<number | null>(
    defaultValues?.leader_id ?? null
  )

  const sortedSectors = useMemo(
    () => [...sectors].sort((a, b) => a.name.localeCompare(b.name)),
    [sectors]
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

  useEffect(() => {
    if (!cepValue) return
    const digits = cepValue.replace(/\D/g, "")
    if (digits.length !== 8) return
    lookupCep(digits).then((result) => {
      if (!result) return
      setValue("street", result.logradouro)
      setValue("neighborhood", result.bairro)
      setValue("city", result.localidade)
      setValue("state", result.uf)
    })
  }, [cepValue, setValue])

  const completedCourses = watch("completed_courses") ?? []

  const handleSectorChange = (value: string) => {
    const id = parseInt(value)
    setSelectedSectorId(id)
    setSelectedLifeGroupId(null)
    setSelectedLeaderId(null)
    setValue("sector_id", id)
    setValue("life_group_id", null)
    setValue("leader_id", null)
  }

  const handleLifeGroupChange = (value: string) => {
    const id = parseInt(value)
    const lg = lifeGroups.find((g) => g.id === id)
    if (!lg) return
    setSelectedLifeGroupId(id)
    setValue("life_group_id", id)
    if (!selectedSectorId && lg.sector_id) {
      setSelectedSectorId(lg.sector_id)
      setValue("sector_id", lg.sector_id)
    }
    if (lg.leader_id != null) {
      setSelectedLeaderId(lg.leader_id)
      setValue("leader_id", lg.leader_id)
    }
  }

  const handleLeaderChange = (value: string) => {
    const id = parseInt(value)
    setSelectedLeaderId(id)
    setValue("leader_id", id)
  }

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        await create.mutateAsync(data)
        toast.success("Membro registrado")
        router.push("/formularios/member-registrations")
      })}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Nome completo *</Label>
          <Input {...register("full_name")} />
          {errors.full_name && <p className="text-sm text-destructive mt-1">{errors.full_name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>E-mail *</Label>
          <Input {...register("email")} type="email" />
          {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>WhatsApp *</Label>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => <PhoneInput value={field.value} onChange={field.onChange} />}
          />
          {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Data de nascimento *</Label>
          <Controller
            control={control}
            name="birth_date"
            render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} className="w-full" />}
          />
          {errors.birth_date && <p className="text-sm text-destructive mt-1">{errors.birth_date.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Gênero *</Label>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="m">Masculino</SelectItem>
                  <SelectItem value="f">Feminino</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.gender && <p className="text-sm text-destructive mt-1">{errors.gender.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Estado civil *</Label>
          <Controller
            control={control}
            name="civil_state"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                  <SelectItem value="casado">Casado(a)</SelectItem>
                  <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                  <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                  <SelectItem value="uniao_estavel">União estável</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.civil_state && <p className="text-sm text-destructive mt-1">{errors.civil_state.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Setor *</Label>
          <Select
            value={selectedSectorId?.toString() ?? ""}
            onValueChange={handleSectorChange}
          >
            <SelectTrigger><SelectValue placeholder="Selecione um setor" /></SelectTrigger>
            <SelectContent>
              {sortedSectors.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.sector_id && <p className="text-sm text-destructive mt-1">{errors.sector_id.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Life Group</Label>
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
        </div>

        <div className="space-y-1.5">
          <Label>Líder</Label>
          <Select
            value={selectedLeaderId?.toString() ?? ""}
            onValueChange={handleLeaderChange}
          >
            <SelectTrigger><SelectValue placeholder="Selecione um líder" /></SelectTrigger>
            <SelectContent>
              {allLeaders.map((l) => (
                <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <h3 className="font-medium pt-2">Endereço</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>CEP</Label>
          <Input {...register("cep")} placeholder="00000-000" />
        </div>
        <div className="space-y-1.5">
          <Label>Logradouro</Label>
          <Input {...register("street")} />
        </div>
        <div className="space-y-1.5">
          <Label>Número</Label>
          <Input {...register("address_number")} />
        </div>
        <div className="space-y-1.5">
          <Label>Complemento</Label>
          <Input {...register("complement")} />
        </div>
        <div className="space-y-1.5">
          <Label>Bairro</Label>
          <Input {...register("neighborhood")} />
        </div>
        <div className="space-y-1.5">
          <Label>Cidade</Label>
          <Input {...register("city")} />
        </div>
        <div className="space-y-1.5">
          <Label>Estado (UF)</Label>
          <Input {...register("state")} maxLength={2} />
        </div>
      </div>

      {courses.length > 0 && (
        <div>
          <h3 className="font-medium pt-2 mb-2">Cursos concluídos</h3>
          <div className="flex flex-wrap gap-3">
            {courses.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <Checkbox
                  id={`course-${c.id}`}
                  checked={completedCourses.includes(c.id)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...completedCourses, c.id]
                      : completedCourses.filter((id) => id !== c.id)
                    setValue("completed_courses", next)
                  }}
                />
                <Label htmlFor={`course-${c.id}`} className="font-normal cursor-pointer">
                  {c.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting}>
        Salvar
      </Button>
    </form>
  )
}
