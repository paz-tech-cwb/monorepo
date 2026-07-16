"use client"
import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AddressForm, EMPTY_ADDRESS, addressFormDataToLine, type AddressFormData } from "@/components/ui/address-form"
import { Textarea } from "@/components/ui/textarea"
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
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const schema = z.object({
  full_name: z.string().min(2, "Obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().regex(/^\+55[0-9]{10,11}$/, "Telefone inválido"),
  decision_type: z.enum(["first_time", "reconciliation"], { required_error: "Obrigatório" }),
  how_met_church: z.string().min(1, "Obrigatório"),
  how_met_church_other: z.string().optional(),
  gender: z.enum(["m", "f"], { required_error: "Obrigatório" }),
  birth_date: z.string().min(1, "Obrigatório"),
  civil_state: z.string().min(1, "Obrigatório"),
  address: z.string().min(1, "Obrigatório"),
  attendance_count: z.string().min(1, "Obrigatório"),
  life_group_status: z.string().min(1, "Obrigatório"),
  life_group_leader_or_name: z.string().optional(),
  invited_by: z.string().optional(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function FormConversionsForm({ defaultValues }: { defaultValues?: Partial<FormValues> }) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })
  const [addressValue, setAddressValue] = useState<AddressFormData>(EMPTY_ADDRESS)
  const create = useCreateFormSubmission<unknown, FormValues>("form-conversions")
  const router = useRouter()

  const handleAddressChange = (address: AddressFormData) => {
    setAddressValue(address)
    setValue("address", addressFormDataToLine(address))
  }

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        await create.mutateAsync(data)
        toast.success("Conversão registrada")
        router.push("/formularios/form-conversions")
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
          <Label>E-mail</Label>
          <Input {...register("email")} type="email" />
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
          <Label>Tipo de decisão *</Label>
          <Controller
            control={control}
            name="decision_type"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_time">Primeira vez</SelectItem>
                  <SelectItem value="reconciliation">Reconciliação</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.decision_type && <p className="text-sm text-destructive mt-1">{errors.decision_type.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Como conheceu a igreja *</Label>
          <Input {...register("how_met_church")} />
          {errors.how_met_church && <p className="text-sm text-destructive mt-1">{errors.how_met_church.message}</p>}
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
          <Label>Data de nascimento *</Label>
          <Controller
            control={control}
            name="birth_date"
            render={({ field }) => <DatePickerInput value={field.value} onChange={field.onChange} className="w-full" />}
          />
          {errors.birth_date && <p className="text-sm text-destructive mt-1">{errors.birth_date.message}</p>}
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
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Endereço *</Label>
          <AddressForm value={addressValue} onChange={handleAddressChange} idPrefix="form-conversion-" required />
          {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Quantas vezes já veio *</Label>
          <Input {...register("attendance_count")} />
          {errors.attendance_count && <p className="text-sm text-destructive mt-1">{errors.attendance_count.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Status no Life Group *</Label>
          <Input {...register("life_group_status")} />
          {errors.life_group_status && <p className="text-sm text-destructive mt-1">{errors.life_group_status.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Líder / nome do LG</Label>
          <Input {...register("life_group_leader_or_name")} />
        </div>
        <div className="space-y-1.5">
          <Label>Convidado por</Label>
          <Input {...register("invited_by")} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea {...register("notes")} />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Salvar
      </Button>
    </form>
  )
}
