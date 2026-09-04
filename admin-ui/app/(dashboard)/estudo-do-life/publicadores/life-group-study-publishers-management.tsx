"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog"
import { useAuth } from "@/lib/hooks/use-auth"
import { useUsers } from "@/lib/hooks/use-users"
import { ApiError } from "@/lib/api/client"
import {
  useLifeGroupStudyPublishers,
  useAddLifeGroupStudyPublisher,
  useRemoveLifeGroupStudyPublisher,
} from "@/lib/hooks/use-life-group-studies"

export function LifeGroupStudyPublishersManagement() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (user?.role !== "admin") {
    return (
      <div className="p-6 space-y-4">
        <p className="text-destructive">
          Apenas administradores podem gerenciar publicadores do Estudo do Life.
        </p>
        <Button variant="outline" asChild>
          <Link href="/estudo-do-life">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>
    )
  }

  return <PublishersTable />
}

function PublishersTable() {
  const { data: publishers = [], isLoading, error } = useLifeGroupStudyPublishers()
  const { data: allUsers = [] } = useUsers()
  const addPublisher = useAddLifeGroupStudyPublisher()
  const removePublisher = useRemoveLifeGroupStudyPublisher()

  const [addingPublisher, setAddingPublisher] = useState(false)
  const [search, setSearch] = useState("")
  const [removingUserId, setRemovingUserId] = useState<number | null>(null)

  const grantedUserIds = new Set(publishers.map((p) => p.user_id))
  const candidates = allUsers.filter(
    (u) =>
      !grantedUserIds.has(u.id) &&
      u.role === "member" &&
      u.name?.toLowerCase().includes(search.toLowerCase())
  )

  const usersById = new Map(allUsers.map((u) => [u.id, u]))

  const handleAdd = async (userId: number) => {
    try {
      await addPublisher.mutateAsync({ user_id: userId })
      toast.success("Publicador adicionado")
      setSearch("")
      setAddingPublisher(false)
    } catch (err) {
      console.error(err)
      const message =
        err instanceof ApiError && err.status === 400
          ? "Dados inválidos ao adicionar publicador."
          : err instanceof ApiError && err.status === 403
            ? "Você não tem permissão para adicionar publicadores."
            : "Falha ao adicionar publicador"
      toast.error(message)
    }
  }

  const handleRemove = async (userId: number) => {
    try {
      await removePublisher.mutateAsync(userId)
      toast.success("Publicador removido")
      setRemovingUserId(null)
    } catch (err) {
      console.error(err)
      const message =
        err instanceof ApiError && err.status === 403
          ? "Você não tem permissão para remover publicadores."
          : "Falha ao remover publicador"
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
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Erro ao carregar publicadores: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/estudo-do-life">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Publicadores do Estudo do Life</h1>
          <p className="text-muted-foreground">
            Conceda acesso de publicação a pessoas fora dos cargos de liderança fixos
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Publicadores concedidos individualmente</CardTitle>
              <CardDescription>
                Admin, pastor, líderes de área/setor/life group já publicam por padrão
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {publishers.map((publisher) => {
                const publisherUser = usersById.get(publisher.user_id)
                return (
                  <TableRow key={publisher.id}>
                    <TableCell>{publisherUser?.name ?? publisher.user_id}</TableCell>
                    <TableCell>{publisherUser?.email ?? "—"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setRemovingUserId(publisher.user_id)}
                      >
                        Remover
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {publishers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nenhum publicador concedido individualmente
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {addingPublisher ? (
            <Command className="border rounded-md">
              <CommandInput
                placeholder="Buscar por nome..."
                value={search}
                onValueChange={setSearch}
                autoFocus
              />
              <CommandList className="max-h-40">
                {candidates.slice(0, 10).map((u) => (
                  <CommandItem key={u.id} onSelect={() => handleAdd(u.id)}>
                    {u.name}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAddingPublisher(true)}>
              <Plus className="w-3 h-3 mr-1" />
              Adicionar publicador
            </Button>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={removingUserId !== null}
        onOpenChange={(open) => {
          if (!open) setRemovingUserId(null)
        }}
        entityName="este publicador"
        onConfirm={() => {
          if (removingUserId !== null) handleRemove(removingUserId)
        }}
        isLoading={removePublisher.isPending}
      />
    </div>
  )
}
