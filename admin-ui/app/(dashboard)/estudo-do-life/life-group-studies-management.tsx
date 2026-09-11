"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import {
  BookMarked,
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import {
  useLifeGroupStudies,
  useDeleteLifeGroupStudy,
} from "@/lib/hooks/use-life-group-studies"
import { useAuth } from "@/lib/hooks/use-auth"
import { canSeePublishUi } from "@/lib/permissions/life-group-studies"
import { ApiError } from "@/lib/api/client"

const PAGE_SIZE = 20

export function LifeGroupStudiesManagement() {
  const { user } = useAuth()
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data, isLoading, error } = useLifeGroupStudies({ page, limit: PAGE_SIZE })
  const deleteMutation = useDeleteLifeGroupStudy()

  const canPublish = canSeePublishUi(user?.role)
  const isAdmin = user?.role === "admin"

  const studies = data?.data ?? []
  const meta = data?.meta

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      setDeletingId(null)
      toast.success("Estudo excluído")
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 403
          ? "Você não tem permissão para excluir este estudo."
          : "Falha ao excluir o estudo."
      toast.error(message)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    const message =
      error instanceof ApiError && error.status === 403
        ? "Você não tem permissão para visualizar os estudos do Life."
        : "Erro ao carregar estudos. Tente novamente."
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{message}</p>
      </div>
    )
  }

  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Estudo do Life</h1>
          <p className="text-muted-foreground">
            Estudos publicados para os líderes de Life Group
          </p>
        </div>
        {isAdmin && (
          <Button variant="outline" asChild>
            <Link href="/estudo-do-life/publicadores">
              <Settings className="mr-2 h-4 w-4" />
              Gerenciar publicadores
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Estudos</CardTitle>
              <CardDescription>{meta?.total ?? studies.length} estudo(s) publicado(s)</CardDescription>
            </div>
            {canPublish && (
              <Button onClick={() => router.push("/estudo-do-life/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Publicar Estudo
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudo</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Publicado em</TableHead>
                {canPublish && <TableHead className="w-[70px]">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {studies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canPublish ? 4 : 3} className="text-center text-muted-foreground">
                    Nenhum estudo publicado ainda
                  </TableCell>
                </TableRow>
              )}
              {studies.map((study) => (
                <TableRow key={study.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {study.image_url ? (
                        <img
                          src={study.image_url}
                          alt={study.title}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <BookMarked className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <p className="font-medium">{study.title}</p>
                    </div>
                  </TableCell>
                  <TableCell>{study.author}</TableCell>
                  <TableCell>
                    {format(new Date(study.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  {canPublish && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/estudo-do-life/${study.id}/edit`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setTimeout(() => setDeletingId(study.id), 0)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {meta && totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null)
        }}
        entityName="este estudo"
        onConfirm={() => {
          if (deletingId !== null) handleDelete(deletingId)
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
