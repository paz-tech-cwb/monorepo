"use client"
import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateFormSubmission } from "@/lib/hooks/use-form-submissions"
import { useFormCourses } from "@/lib/hooks/use-form-courses"
import { lookupCep } from "@/lib/api/endpoints/cep"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  full_name: z.string().min(2, "Obrigatório"),
  birth_date: z.string().min(1, "Obrigatório"),
  phone: z.string().regex(/^\+?[0-9]{8,15}$/, "Formato: +5511999999999"),
  gender: z.enum(["m", "f"], { required_error: "Obrigatório" }),
  civil_state: z.string().min(1, "Obrigatório"),
  sector_id: z.coerce.number().int().positive("Obrigatório"),
  life_group_id: z.coerce.number().int().positive().optional().nullable(),
  leader_id: z.coerce.number().int().positive().optional().nullable(),
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
  const router = useRouter()
  const cepValue = watch("cep")

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
        <div>
          <Label>Nome completo *</Label>
          <Input {...register("full_name")} />
          {errors.full_name && <p className="text-sm text-destructive mt-1">{errors.full_name.message}</p>}
        </div>
        <div>
          <Label>E-mail *</Label>
          <Input {...register("email")} type="email" />
          {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <Label>WhatsApp *</Label>
          <Input {...register("phone")} placeholder="+5511999999999" />
          {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>}
        </div>
        <div>
          <Label>Data de nascimento *</Label>
          <Input {...register("birth_date")} type="date" />
          {errors.birth_date && <p className="text-sm text-destructive mt-1">{errors.birth_date.message}</p>}
        </div>
        <div>
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
        <div>
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
        <div>
          <Label>ID do setor *</Label>
          <Input {...register("sector_id")} type="number" />
          {errors.sector_id && <p className="text-sm text-destructive mt-1">{errors.sector_id.message}</p>}
        </div>
        <div>
          <Label>ID do Life Group</Label>
          <Input {...register("life_group_id")} type="number" />
        </div>
      </div>

      <h3 className="font-medium pt-2">Endereço</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>CEP</Label>
          <Input {...register("cep")} placeholder="00000-000" />
        </div>
        <div>
          <Label>Logradouro</Label>
          <Input {...register("street")} />
        </div>
        <div>
          <Label>Número</Label>
          <Input {...register("address_number")} />
        </div>
        <div>
          <Label>Complemento</Label>
          <Input {...register("complement")} />
        </div>
        <div>
          <Label>Bairro</Label>
          <Input {...register("neighborhood")} />
        </div>
        <div>
          <Label>Cidade</Label>
          <Input {...register("city")} />
        </div>
        <div>
          <Label>Estado (UF)</Label>
          <Input {...register("state")} maxLength={2} />
        </div>
      </div>

      {courses.length > 0 && (
        <div>
          <h3 className="font-medium pt-2 mb-2">Cursos concluídos</h3>
          <div className="flex flex-wrap gap-3">
            {courses.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  value={c.id}
                  checked={completedCourses.includes(c.id)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...completedCourses, c.id]
                      : completedCourses.filter((id) => id !== c.id)
                    setValue("completed_courses", next)
                  }}
                />
                {c.name}
              </label>
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
