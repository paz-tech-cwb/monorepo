"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import type { Question, QuestionOption, QuestionType } from "@/lib/api/types/academy"

interface QuestionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: Question | null
  onSubmit: (question: Question) => void
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "Escolha única",
  multiple_choice: "Múltipla escolha",
  free_text: "Resposta livre",
}

function emptyQuestion(): Question {
  return {
    text: "",
    type: "single_choice",
    points: 1,
    options: [
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ],
  }
}

export function QuestionFormDialog({ open, onOpenChange, question, onSubmit }: QuestionFormDialogProps) {
  const [draft, setDraft] = useState<Question>(emptyQuestion())

  useEffect(() => {
    if (open) {
      setDraft(question ? { ...question, options: question.options?.map((o) => ({ ...o })) ?? [] } : emptyQuestion())
    }
  }, [open, question])

  const options = draft.options ?? []

  const updateOption = (index: number, patch: Partial<QuestionOption>) => {
    const next = options.map((o, i) => (i === index ? { ...o, ...patch } : o))
    setDraft({ ...draft, options: next })
  }

  const handleSingleCorrectChange = (index: number) => {
    const next = options.map((o, i) => ({ ...o, is_correct: i === index }))
    setDraft({ ...draft, options: next })
  }

  const addOption = () => {
    setDraft({ ...draft, options: [...options, { text: "", is_correct: false }] })
  }

  const removeOption = (index: number) => {
    setDraft({ ...draft, options: options.filter((_, i) => i !== index) })
  }

  const handleTypeChange = (type: QuestionType) => {
    setDraft({
      ...draft,
      type,
      options: type === "free_text" ? [] : options.length > 0 ? options : emptyQuestion().options,
    })
  }

  const handleSubmit = () => {
    onSubmit({
      ...draft,
      options: draft.type === "free_text" ? [] : draft.options,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{question ? "Editar Pergunta" : "Nova Pergunta"}</DialogTitle>
          <DialogDescription>Configure o enunciado, o tipo e as opções de resposta</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="question-text">Pergunta</Label>
            <Input
              id="question-text"
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              placeholder="Digite a pergunta"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="question-type">Tipo</Label>
              <Select value={draft.type} onValueChange={(v) => handleTypeChange(v as QuestionType)}>
                <SelectTrigger id="question-type">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="question-points">Pontos</Label>
              <Input
                id="question-points"
                type="number"
                min={1}
                value={draft.points ?? 1}
                onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })}
              />
            </div>
          </div>

          {draft.type !== "free_text" && (
            <div className="space-y-2">
              <Label>Opções de resposta</Label>

              {draft.type === "single_choice" ? (
                <RadioGroup
                  value={String(options.findIndex((o) => o.is_correct))}
                  onValueChange={(v) => handleSingleCorrectChange(Number(v))}
                  className="space-y-2"
                >
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <RadioGroupItem value={String(index)} id={`option-${index}`} />
                      <Input
                        value={option.text}
                        onChange={(e) => updateOption(index, { text: e.target.value })}
                        placeholder={`Opção ${index + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeOption(index)}
                        disabled={options.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Checkbox
                        checked={option.is_correct}
                        onCheckedChange={(checked) => updateOption(index, { is_correct: checked === true })}
                      />
                      <Input
                        value={option.text}
                        onChange={(e) => updateOption(index, { text: e.target.value })}
                        placeholder={`Opção ${index + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeOption(index)}
                        disabled={options.length <= 2}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button variant="outline" size="sm" onClick={addOption}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar opção
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Salvar Pergunta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
