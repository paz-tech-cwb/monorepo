"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Route, BookOpen, Clock, Target } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { academyApi } from "@/lib/api/endpoints/academy"

export function CourseTracksManagement() {
  const [searchTerm, setSearchTerm] = useState("")

  const { data: academy, isLoading, error } = useQuery({
    queryKey: ["academy"],
    queryFn: () => academyApi.getAcademy(),
  })

  const tracks = academy?.tracks ?? []

  const filteredTracks = tracks.filter(
    (track) =>
      track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (track.description || "").toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalCourses = tracks.reduce((sum, track) => sum + track.courses.length, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Trilhos de Cursos</h1>
        <p className="text-muted-foreground">Gerencie as trilhas de formacao da academia</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Trilhas</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "-" : tracks.length}</div>
            <p className="text-xs text-muted-foreground">Trilhas cadastradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cursos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "-" : totalCourses}</div>
            <p className="text-xs text-muted-foreground">Em todas as trilhas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Media por Trilha</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading || tracks.length === 0 ? "-" : Math.round(totalCourses / tracks.length)}
            </div>
            <p className="text-xs text-muted-foreground">Cursos por trilha</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Trilhas da Academia</CardTitle>
            <CardDescription>{filteredTracks.length} trilha(s) encontrada(s)</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar trilhas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="text-destructive text-center py-8">Erro ao carregar trilhas. Tente novamente mais tarde.</p>
          ) : filteredTracks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma trilha encontrada.</p>
          ) : (
            <div className="space-y-4">
              {filteredTracks.map((track) => (
                <Card key={track.id} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{track.title}</CardTitle>
                        {track.description && (
                          <CardDescription className="mt-1">{track.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant="outline" className="ml-2 shrink-0">
                        {track.courses.length} curso(s)
                      </Badge>
                    </div>
                  </CardHeader>
                  {track.courses.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2">
                        {track.courses.map((course) => (
                          <div
                            key={course.id}
                            className="flex items-center gap-2 border border-border rounded-md px-2 py-1 text-sm"
                          >
                            <BookOpen className="h-3 w-3 text-muted-foreground" />
                            <span>{course.title}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
