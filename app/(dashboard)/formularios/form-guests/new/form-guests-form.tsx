"use client"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PhoneInput } from "@/components/ui/phone-input"
import { useCreateFormSubmission } from "@/lib/hooks/use-form-submissions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const schema = z.object({
  full_name: z.string().min(2, "Obrigatório"),
  phone: z.string().regex(/^\+55[0-9]{10,11}$/, "Telefone inválido").optional().or(z.literal("")),
  invited_by: z.string().optional(),
  how_met_church: z.string().optional(),
  filled_by: z.string().optional(),
  notes: z.string().optional(),
  via_casa_de_paz: z.boolean().optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  defaultValues?: Partial<FormValues>
  onSubmit?: (data: FormValues) => Promise<void>
}

export function FormGuestsForm({ defaultValues, onSubmit: onSubmitProp }: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })
  const create = useCreateFormSubmission<unknown, FormValues>("form-guests")
  const router = useRouter()

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        if (onSubmitProp) {
          await onSubmitProp(data)
          return
        }
        await create.mutateAsync(data)
        toast.success("Convidado registrado")
        router.push("/formularios/form-guests")
      })}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label>Nome completo *</Label>
        <Input {...register("full_name")} />
        {errors.full_name && (
          <p className="text-sm text-destructive mt-1">{errors.full_name.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>WhatsApp</Label>
        <Controller
          control={control}
          name="phone"
          render={({ field }) => <PhoneInput value={field.value} onChange={field.onChange} />}
        />
        {errors.phone && (
          <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Convidado por</Label>
        <Input {...register("invited_by")} />
      </div>
      <div className="space-y-1.5">
        <Label>Como conheceu a igreja</Label>
        <Input {...register("how_met_church")} />
      </div>
      <div className="space-y-1.5">
        <Label>Preenchido por</Label>
        <Input {...register("filled_by")} />
      </div>
      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea {...register("notes")} />
      </div>
      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="via_casa_de_paz"
          render={({ field }) => (
            <Checkbox
              id="via_casa_de_paz"
              checked={field.value ?? false}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="via_casa_de_paz">Convidado veio de uma Casa de Paz</Label>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Salvar
      </Button>
    </form>
  )
}
