"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useCourse } from "@/lib/hooks/use-courses"
import { LessonsTab } from "./lessons-tab"
import { QuestionnaireTab } from "./questionnaire-tab"

interface CourseDetailManagementProps {
  courseId: string
}

export function CourseDetailManagement({ courseId }: CourseDetailManagementProps) {
  const { data: course, isLoading, error } = useCourse(courseId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Erro ao carregar curso.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-3 mb-2">
          <Link href="/courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Cursos
          </Link>
        </Button>
        <h1 className="text-3xl font-bold text-foreground">{course.title}</h1>
        <p className="text-muted-foreground">{course.description}</p>
      </div>

      <Tabs defaultValue="lessons">
        <TabsList>
          <TabsTrigger value="lessons">Lições</TabsTrigger>
          <TabsTrigger value="questionnaire">Questionário</TabsTrigger>
        </TabsList>
        <TabsContent value="lessons">
          <LessonsTab courseId={courseId} />
        </TabsContent>
        <TabsContent value="questionnaire">
          <QuestionnaireTab courseId={courseId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
