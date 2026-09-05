"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MarkdownEditor } from "@/components/markdown-editor"
import { ApiError } from "@/lib/api/client"
import {
  useCreateLifeGroupStudy,
  useUpdateLifeGroupStudy,
} from "@/lib/hooks/use-life-group-studies"
import type { LifeGroupStudy } from "@/lib/api/types/life-group-studies"

const schema = z.object({
  image_url: z.string().optional(),
  title: z.string().min(1, "Obrigatório"),
  author: z.string().min(1, "Obrigatório"),
  body_markdown: z.string().min(1, "Obrigatório"),
})
type FormValues = z.infer<typeof schema>

function toastForbidden() {
  toast.error(
    "Você não tem permissão para publicar estudos do Life. Fale com um administrador."
  )
}

export function LifeGroupStudyForm({ study }: { study?: LifeGroupStudy }) {
  const router = useRouter()
  const createMutation = useCreateLifeGroupStudy()
  const updateMutation = useUpdateLifeGroupStudy()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      image_url: study?.image_url ?? "",
      title: study?.title ?? "",
      author: study?.author ?? "",
      body_markdown: study?.body_markdown ?? "",
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    const payload = {
      title: data.title,
      author: data.author,
      body_markdown: data.body_markdown,
      image_url: data.image_url || null,
    }

    try {
      if (study) {
        await updateMutation.mutateAsync({ id: study.id, data: payload })
        toast.success("Estudo atualizado")
        router.push("/estudo-do-life")
      } else {
        await createMutation.mutateAsync(payload)
        toast.success("Estudo publicado")
        router.push("/estudo-do-life")
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toastForbidden()
        return
      }
      toast.error(study ? "Falha ao atualizar o estudo." : "Falha ao publicar o estudo.")
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-3xl">
      <div className="space-y-1.5">
        <Label htmlFor="study-title">Título *</Label>
        <Input id="study-title" {...register("title")} placeholder="Título do estudo" />
        {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="study-author">Autor *</Label>
        <Input id="study-author" {...register("author")} placeholder="Nome do autor" />
        {errors.author && <p className="text-sm text-destructive mt-1">{errors.author.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="study-image_url">URL da imagem (opcional)</Label>
        <Input id="study-image_url" {...register("image_url")} placeholder="https://..." />
      </div>

      <div className="space-y-1.5 flex flex-col">
        <Label>Conteúdo (Markdown) *</Label>
        <MarkdownEditor
          value={watch("body_markdown")}
          onChange={(value) => setValue("body_markdown", value, { shouldValidate: true })}
          placeholder="Escreva o conteúdo do estudo em Markdown..."
        />
        {errors.body_markdown && (
          <p className="text-sm text-destructive mt-1">{errors.body_markdown.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.push("/estudo-do-life")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {study ? "Salvar" : "Publicar Estudo"}
        </Button>
      </div>
    </form>
  )
}
