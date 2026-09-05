"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
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
import { PeopleAutocomplete } from "@/components/ui/people-autocomplete"
import { AddressForm, EMPTY_ADDRESS, type AddressFormData } from "@/components/ui/address-form"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useCreateConversion } from "@/lib/hooks/use-conversions"
import { formatPhoneBR, validatePhoneBR } from "@/lib/utils/phone"
import type {
  ConversionType,
  HowMetChurch,
  Sex,
  CivilStatus,
  ChurchAttendance,
  LifeGroupExperience,
  UserSearchResult,
} from "@/lib/api/types"

const conversionSchema = z.object({
  full_name: z.string().min(3, "Nome completo e obrigatorio"),
  cellphone: z.string().refine(validatePhoneBR, {
    message: "Telefone invalido",
  }),
  type: z.enum(["primeira_vez", "reconciliacao"], {
    required_error: "Tipo e obrigatorio",
  }),
  how_met_church: z.enum([
    "convite_amigo",
    "convite_parente",
    "redes_sociais",
    "passou_frente",
    "outro",
  ]),
  how_met_church_other: z.string().optional(),
  sex: z.enum(["feminino", "masculino"]),
  age: z.number().min(1, "Idade e obrigatoria").max(150),
  civil_status: z.enum(["solteiro", "casado", "divorciado", "viuvo"]),
  street: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  church_attendance_history: z.enum([
    "primeira_vez",
    "segunda_vez",
    "terceira_vez",
    "mais_uma_vez",
  ]),
  life_group_experience: z.enum(["sim", "nao", "ja_foi_convidado"]),
  life_group_leader_name: z.string().optional(),
  who_invited: z.string().optional(),
  observations: z.string().optional(),
})

type ConversionFormData = z.infer<typeof conversionSchema>

export function ConversionForm() {
  const router = useRouter()
  const createMutation = useCreateConversion()

  const [nameValue, setNameValue] = useState("")
  const [phoneValue, setPhoneValue] = useState("")
  const [addressValue, setAddressValue] = useState<AddressFormData>(EMPTY_ADDRESS)
  const [showOtherField, setShowOtherField] = useState(false)
  const [showLeaderField, setShowLeaderField] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<ConversionFormData>({
    resolver: zodResolver(conversionSchema),
  })

  const howMetChurch = watch("how_met_church")
  const lifeGroupExperience = watch("life_group_experience")

  const handleNameChange = (value: string) => {
    setNameValue(value)
    setValue("full_name", value)
  }

  const handlePersonSelect = (person: UserSearchResult) => {
    setNameValue(person.name)
    setValue("full_name", person.name)
    if (person.phone) {
      const formatted = formatPhoneBR(person.phone)
      setPhoneValue(formatted)
      setValue("cellphone", formatted)
    }
    if (person.birth_date) {
      const birthDate = new Date(person.birth_date)
      if (!Number.isNaN(birthDate.getTime())) {
        const ageDiffMs = Date.now() - birthDate.getTime()
        const age = Math.floor(ageDiffMs / (1000 * 60 * 60 * 24 * 365.25))
        setValue("age", age)
      }
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneBR(e.target.value)
    setPhoneValue(formatted)
    setValue("cellphone", formatted)
  }

  const handleAddressChange = (address: AddressFormData) => {
    setAddressValue(address)
    setValue("street", address.street)
    setValue("neighborhood", address.neighborhood)
    setValue("city", address.city)
  }

  const onSubmit = async (data: ConversionFormData) => {
    try {
      const payload = {
        ...data,
        how_met_church_other:
          data.how_met_church === "outro" ? data.how_met_church_other : undefined,
        life_group_leader_name:
          data.life_group_experience === "sim"
            ? data.life_group_leader_name
            : undefined,
      }
      await createMutation.mutateAsync(payload)
      toast.success("Conversao/Reconciliacao registrada com sucesso!")
      router.push("/conversions")
    } catch {
      toast.error("Erro ao registrar. Tente novamente.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Registro de Conversao/Reconciliacao
        </h1>
        <p className="text-muted-foreground">
          Preencha os dados da pessoa
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Informacoes Pessoais</CardTitle>
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
                <PeopleAutocomplete
                  id="full_name"
                  value={nameValue}
                  onChange={handleNameChange}
                  onSelect={handlePersonSelect}
                  placeholder="Nome completo"
                />
                {errors.full_name && (
                  <p className="text-sm text-destructive">
                    {errors.full_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cellphone">
                  Celular/WhatsApp <span className="text-destructive">*</span>
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
            </div>

            <div className="space-y-2">
              <Label>
                Tipo <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primeira_vez">Primeira Vez</SelectItem>
                        <SelectItem value="reconciliacao">Reconciliacao</SelectItem>
                      </SelectContent>
                    </Select>
                )}
              />
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Como conheceu a igreja? <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="how_met_church"
                control={control}
                render={({ field }) => (
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value)
                        setShowOtherField(value === "outro")
                      }}
                      value={field.value}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="convite_amigo" id="convite_amigo" />
                        <Label htmlFor="convite_amigo" className="font-normal">
                          Convite de amigo
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="convite_parente"
                          id="convite_parente"
                        />
                        <Label htmlFor="convite_parente" className="font-normal">
                          Convite de parente
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="redes_sociais" id="redes_sociais" />
                        <Label htmlFor="redes_sociais" className="font-normal">
                          Redes sociais
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="passou_frente" id="passou_frente" />
                        <Label htmlFor="passou_frente" className="font-normal">
                          Passou em frente
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="outro" id="outro" />
                        <Label htmlFor="outro" className="font-normal">
                          Outro
                        </Label>
                      </div>
                    </RadioGroup>
                )}
              />
              {errors.how_met_church && (
                <p className="text-sm text-destructive">
                  {errors.how_met_church.message}
                </p>
              )}
            </div>

            {showOtherField && (
              <div className="space-y-2">
                <Label htmlFor="how_met_church_other">Especifique</Label>
                <Input
                  id="how_met_church_other"
                  {...register("how_met_church_other")}
                  placeholder="Como conheceu a igreja?"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  Sexo <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="sex"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="feminino" id="feminino" />
                          <Label htmlFor="feminino" className="font-normal">
                            Feminino
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="masculino" id="masculino" />
                          <Label htmlFor="masculino" className="font-normal">
                            Masculino
                          </Label>
                        </div>
                    </RadioGroup>
                  )}
                />
                {errors.sex && (
                  <p className="text-sm text-destructive">{errors.sex.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">
                  Idade <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="age"
                  type="number"
                  {...register("age", { valueAsNumber: true })}
                  placeholder="Idade"
                  min={1}
                  max={150}
                />
                {errors.age && (
                  <p className="text-sm text-destructive">{errors.age.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Estado Civil <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="civil_status"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solteiro">Solteiro</SelectItem>
                          <SelectItem value="casado">Casado</SelectItem>
                          <SelectItem value="divorciado">Divorciado</SelectItem>
                          <SelectItem value="viuvo">Viuvo</SelectItem>
                        </SelectContent>
                    </Select>
                  )}
                />
                {errors.civil_status && (
                  <p className="text-sm text-destructive">
                    {errors.civil_status.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Endereco</Label>
              <AddressForm value={addressValue} onChange={handleAddressChange} idPrefix="conversion-" />
            </div>

            <div className="space-y-2">
              <Label>
                Historico de frequencia <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="church_attendance_history"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primeira_vez">Primeira Vez</SelectItem>
                      <SelectItem value="segunda_vez">Segunda vez</SelectItem>
                      <SelectItem value="terceira_vez">Terceira vez</SelectItem>
                      <SelectItem value="mais_uma_vez">Mais de uma vez</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.church_attendance_history && (
                <p className="text-sm text-destructive">
                  {errors.church_attendance_history.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Experiencia com Life Group{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="life_group_experience"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={(value) => {
                      field.onChange(value)
                      setShowLeaderField(value === "sim")
                    }}
                    value={field.value}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="lg_sim" />
                      <Label htmlFor="lg_sim" className="font-normal">
                        Sim
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao" id="lg_nao" />
                      <Label htmlFor="lg_nao" className="font-normal">
                        Nao
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ja_foi_convidado" id="lg_convidado" />
                      <Label htmlFor="lg_convidado" className="font-normal">
                        Ja foi convidado
                      </Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {errors.life_group_experience && (
                <p className="text-sm text-destructive">
                  {errors.life_group_experience.message}
                </p>
              )}
            </div>

            {showLeaderField && (
              <div className="space-y-2">
                <Label htmlFor="life_group_leader_name">
                  Nome do Lider do Life Group
                </Label>
                <Input
                  id="life_group_leader_name"
                  {...register("life_group_leader_name")}
                  placeholder="Nome do lider"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="who_invited">Quem convidou?</Label>
              <Input
                id="who_invited"
                {...register("who_invited")}
                placeholder="Nome de quem convidou"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observacoes</Label>
              <Textarea
                id="observations"
                {...register("observations")}
                placeholder="Observacoes adicionais (opcional)"
                rows={4}
              />
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
            {createMutation.isPending ? "Registrando..." : "Registrar"}
          </Button>
        </div>
      </form>
    </div>
  )
}
