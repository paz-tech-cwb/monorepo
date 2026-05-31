"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useCreateMemberUser } from "@/lib/hooks/use-users"
import { useSectors } from "@/lib/hooks/use-sectors"
import { useCourses } from "@/lib/hooks/use-courses"
import { useLifeGroups } from "@/lib/hooks/use-life-groups"
import { formatPhoneBR, validatePhoneBR } from "@/lib/utils/phone"

const memberSchema = z.object({
  full_name: z.string().min(3, "Nome completo e obrigatorio"),
  birthday_date: z.string().min(1, "Data de nascimento e obrigatoria"),
  cellphone: z.string().refine(validatePhoneBR, {
    message: "Telefone invalido",
  }),
  address: z.string().optional(),
  sector_id: z.number({
    required_error: "Setor e obrigatorio",
  }),
  life_group_ids: z.array(z.number()).min(1, "Life Group e obrigatorio"),
  leader_name: z.string().optional(),
  completed_courses: z.array(z.number()).optional(),
})

type MemberFormData = z.infer<typeof memberSchema>

export function MemberRegistrationForm() {
  const router = useRouter()
  const createMutation = useCreateMemberUser()
  const { data: sectors = [] } = useSectors()
  const { data: courses = [] } = useCourses()
  const { data: lifeGroups = [] } = useLifeGroups()

  const [phoneValue, setPhoneValue] = useState("")
  const [selectedCourses, setSelectedCourses] = useState<number[]>([])
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null)
  const [selectedLifeGroupId, setSelectedLifeGroupId] = useState<number | null>(null)
  const [selectedLeaderName, setSelectedLeaderName] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
  })

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
    const seen = new Map<string, string>()
    for (const lg of lifeGroups) {
      if (lg.leader_name && !seen.has(lg.leader_name)) {
        seen.set(lg.leader_name, lg.leader_name)
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b))
  }, [lifeGroups])

  const handleSectorChange = (value: string) => {
    const id = parseInt(value)
    setSelectedSectorId(id)
    setSelectedLifeGroupId(null)
    setSelectedLeaderName(null)
    setValue("sector_id", id)
    setValue("life_group_ids", [])
    setValue("leader_name", undefined)
  }

  const handleLifeGroupChange = (value: string) => {
    const id = parseInt(value)
    const lg = lifeGroups.find((g) => g.id === id)
    if (!lg) return

    setSelectedLifeGroupId(id)
    setValue("life_group_ids", [id])

    if (!selectedSectorId && lg.sector_id) {
      setSelectedSectorId(lg.sector_id)
      setValue("sector_id", lg.sector_id)
    }

    const leaderName = lg.leader_name ?? null
    setSelectedLeaderName(leaderName)
    setValue("leader_name", leaderName ?? undefined)
  }

  const handleLeaderChange = (value: string) => {
    setSelectedLeaderName(value)
    setValue("leader_name", value)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneBR(e.target.value)
    setPhoneValue(formatted)
    setValue("cellphone", formatted)
  }

  const handleCourseToggle = (courseId: number) => {
    setSelectedCourses((prev) => {
      const next = prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
      setValue("completed_courses", next)
      return next
    })
  }

  const onSubmit = async (data: MemberFormData) => {
    try {
      await createMutation.mutateAsync({
        ...data,
        completed_courses: selectedCourses.length > 0 ? selectedCourses : undefined,
      })
      toast.success("Usuario cadastrado com sucesso!")
      router.push("/members")
    } catch {
      toast.error("Erro ao cadastrar membro. Tente novamente.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Cadastro de Membro
        </h1>
        <p className="text-muted-foreground">
          Preencha os dados do novo membro
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Informacoes do Membro</CardTitle>
            <CardDescription>
              Todos os campos marcados com * sao obrigatorios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Nome Completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="full_name"
                  {...register("full_name")}
                  placeholder="Nome completo do membro"
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive">
                    {errors.full_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthday_date">
                  Data de Nascimento <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="birthday_date"
                  type="date"
                  {...register("birthday_date")}
                />
                {errors.birthday_date && (
                  <p className="text-sm text-destructive">
                    {errors.birthday_date.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cellphone">
                  Celular <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cellphone"
                  value={phoneValue}
                  onChange={handlePhoneChange}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
                {errors.cellphone && (
                  <p className="text-sm text-destructive">
                    {errors.cellphone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereco</Label>
                <Input
                  id="address"
                  {...register("address")}
                  placeholder="Endereco completo"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  Setor <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedSectorId?.toString() ?? ""}
                  onValueChange={handleSectorChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedSectors.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id.toString()}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.sector_id && (
                  <p className="text-sm text-destructive">
                    {errors.sector_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Life Group <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedLifeGroupId?.toString() ?? ""}
                  onValueChange={handleLifeGroupChange}
                  disabled={selectedSectorId === null}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        selectedSectorId === null
                          ? "Selecione um setor primeiro"
                          : "Selecione um Life Group"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLifeGroups.map((group) => (
                      <SelectItem key={group.id} value={String(group.id)}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.life_group_ids && (
                  <p className="text-sm text-destructive">
                    {errors.life_group_ids.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Lider</Label>
                <Select
                  value={selectedLeaderName ?? ""}
                  onValueChange={handleLeaderChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um lider" />
                  </SelectTrigger>
                  <SelectContent>
                    {allLeaders.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cursos Concluidos</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded-md p-4">
                {courses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum curso disponivel
                  </p>
                ) : (
                  courses
                    .filter((course) => course.status === "published")
                    .map((course) => (
                      <div key={course.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`course-${course.id}`}
                          checked={selectedCourses.includes(parseInt(course.id))}
                          onCheckedChange={() =>
                            handleCourseToggle(parseInt(course.id))
                          }
                        />
                        <Label
                          htmlFor={`course-${course.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {course.title}
                        </Label>
                      </div>
                    ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Cadastrando..." : "Cadastrar Membro"}
          </Button>
        </div>
      </form>
    </div>
  )
}
