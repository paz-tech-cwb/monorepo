"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownEditor } from "@/components/markdown-editor"
import { useUpdateCasaDePazLesson } from "@/lib/hooks/use-casa-de-paz-lessons"
import type { CasaDePazLesson } from "@/lib/api/types"

export function CasaDePazLessonForm({ lesson }: { lesson: CasaDePazLesson }) {
  const updateMutation = useUpdateCasaDePazLesson()

  const [title, setTitle] = useState(lesson.title)
  const [summary, setSummary] = useState(lesson.summary)
  const [guidelines, setGuidelines] = useState(lesson.guidelines)
  const [youtubeUrl, setYoutubeUrl] = useState(lesson.youtube_url ?? "")
  const [questions, setQuestions] = useState<string[]>(lesson.questions)

  const isDirty =
    title !== lesson.title ||
    summary !== lesson.summary ||
    guidelines !== lesson.guidelines ||
    youtubeUrl !== (lesson.youtube_url ?? "") ||
    JSON.stringify(questions) !== JSON.stringify(lesson.questions)

  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, ""])
  }

  // Removing a question row here only affects local, unsaved form state —
  // nothing is persisted until "Salvar" is pressed — so this does not fall
  // under this repo's "confirm before destroy" convention, which applies to
  // actually-destructive/persisted actions only.
  const handleRemoveQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleQuestionChange = (index: number, value: string) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? value : q)))
  }

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        week: lesson.week,
        data: {
          title,
          summary,
          guidelines,
          questions: questions.filter((q) => q.trim().length > 0),
          youtube_url: youtubeUrl.trim() || undefined,
        },
      })
      toast.success(`Semana ${lesson.week} atualizada`)
    } catch {
      toast.error("Erro ao salvar o conteúdo desta semana.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`lesson-title-${lesson.week}`}>Título</Label>
        <Input
          id={`lesson-title-${lesson.week}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`lesson-summary-${lesson.week}`}>Resumo</Label>
        <Textarea
          id={`lesson-summary-${lesson.week}`}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-1.5 flex flex-col">
        <Label>Orientações</Label>
        <MarkdownEditor
          value={guidelines}
          onChange={setGuidelines}
          placeholder="Escreva as orientações desta semana em Markdown..."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`lesson-youtube-${lesson.week}`}>Link do vídeo (YouTube)</Label>
        <Input
          id={`lesson-youtube-${lesson.week}`}
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </div>

      <div className="space-y-2">
        <Label>Perguntas</Label>
        <div className="space-y-2">
          {questions.map((question, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={question}
                onChange={(e) => handleQuestionChange(index, e.target.value)}
                placeholder={`Pergunta ${index + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveQuestion(index)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAddQuestion}>
          <Plus className="size-4 mr-1" /> Adicionar pergunta
        </Button>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={!isDirty || updateMutation.isPending}>
          {updateMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  )
}
