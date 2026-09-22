"use client"

import { Card } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Skeleton } from "@/components/ui/skeleton"
import { useCasaDePazLessons } from "@/lib/hooks/use-casa-de-paz-lessons"
import { CasaDePazLessonForm } from "./casa-de-paz-lesson-form"

export function CasaDePazLessonsManagement() {
  const { data: lessons = [], isLoading, isError } = useCasaDePazLessons()

  if (isLoading) {
    return (
      <Card className="p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <p className="text-sm text-destructive py-8 text-center">
          Não foi possível carregar o conteúdo da Casa de Paz.
        </p>
      </Card>
    )
  }

  return (
    <Card className="px-4">
      <Accordion type="single" collapsible defaultValue="week-1">
        {lessons.map((lesson) => (
          <AccordionItem key={lesson.week} value={`week-${lesson.week}`}>
            <AccordionTrigger>
              <span>
                Semana {lesson.week}
                {lesson.title ? ` — ${lesson.title}` : ""}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <CasaDePazLessonForm lesson={lesson} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  )
}
