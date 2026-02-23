"use client"

import { useState } from "react"
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
import { formatPhoneBR, validatePhoneBR } from "@/lib/utils/phone"
import { format } from "date-fns"

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
  life_group_id: z.number({
    required_error: "Life Group e obrigatorio",
  }),
  leader_name: z.string().optional(),
  completed_courses: z.array(z.number()).optional(),
})

type MemberFormData = z.infer<typeof memberSchema>

export function MemberRegistrationForm() {
  const router = useRouter()
  const createMutation = useCreateMemberUser()
  const { data: sectors = [] } = useSectors()
  const { data: courses = [] } = useCourses()

  const [phoneValue, setPhoneValue] = useState("")
  const [selectedCourses, setSelectedCourses] = useState<number[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
  })

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneBR(e.target.value)
    setPhoneValue(formatted)
    setValue("cellphone", formatted)
  }

  const handleCourseToggle = (courseId: number) => {
    setSelectedCourses((prev) => {
      if (prev.includes(courseId)) {
        return prev.filter((id) => id !== courseId)
      }
      return [...prev, courseId]
    })
    setValue("completed_courses", selectedCourses)
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sector_id">
                  Setor <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(value) =>
                    setValue("sector_id", parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((sector) => (
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
                <Label htmlFor="life_group_id">
                  Life Group <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(value) =>
                    setValue("life_group_id", parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um Life Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Placeholder - Life Groups should come from API */}
                    <SelectItem value="1">Life Group 1</SelectItem>
                    <SelectItem value="2">Life Group 2</SelectItem>
                    <SelectItem value="3">Life Group 3</SelectItem>
                  </SelectContent>
                </Select>
                {errors.life_group_id && (
                  <p className="text-sm text-destructive">
                    {errors.life_group_id.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leader_name">Nome do Lider</Label>
              <Input
                id="leader_name"
                {...register("leader_name")}
                placeholder="Nome do lider (opcional)"
              />
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
