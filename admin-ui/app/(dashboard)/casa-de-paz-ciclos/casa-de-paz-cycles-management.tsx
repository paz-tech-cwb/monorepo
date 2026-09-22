"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeleton } from "@/components/ui/skeleton-components"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  useCasaDePazCycles,
  useCreateCasaDePazCycle,
  useCloseCasaDePazCycle,
} from "@/lib/hooks/use-casa-de-paz-cycles"

const COLUMN_COUNT = 3

function formatMonth(value: string): string {
  const [year, month] = value.split("-")
  if (!year || !month) return value
  return `${month}/${year}`
}

export function CasaDePazCyclesManagement() {
  const { data: cycles = [], isLoading, isError } = useCasaDePazCycles()
  const createMutation = useCreateCasaDePazCycle()
  const closeMutation = useCloseCasaDePazCycle()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [month, setMonth] = useState("")
  const [name, setName] = useState("")
  const [closingId, setClosingId] = useState<string | null>(null)

  const resetCreateForm = () => {
    setMonth("")
    setName("")
  }

  const handleCreate = async () => {
    if (!month) return
    try {
      await createMutation.mutateAsync({ month, name: name.trim() || undefined })
      toast.success("Ciclo criado")
      resetCreateForm()
      setIsCreateOpen(false)
    } catch {
      toast.error("Erro ao criar ciclo. Verifique se já existe um ciclo para este mês.")
    }
  }

  const handleClose = async () => {
    if (!closingId) return
    try {
      await closeMutation.mutateAsync(closingId)
      toast.success("Ciclo encerrado")
    } catch {
      toast.error("Erro ao encerrar ciclo")
    } finally {
      setClosingId(null)
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="size-4 mr-1" /> Novo ciclo
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={4} columns={COLUMN_COUNT} />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive py-8 text-center">
            Não foi possível carregar os ciclos de Casa de Paz.
          </p>
        ) : cycles.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum ciclo cadastrado ainda.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Mês</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.map((cycle) => (
                <TableRow key={cycle.id}>
                  <TableCell>{cycle.name}</TableCell>
                  <TableCell>{formatMonth(cycle.month)}</TableCell>
                  <TableCell>
                    <Badge variant={cycle.status === "open" ? "default" : "secondary"}>
                      {cycle.status === "open" ? "Aberto" : "Encerrado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {cycle.status === "open" && (
                      <Button variant="outline" size="sm" onClick={() => setClosingId(cycle.id)}>
                        Encerrar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetCreateForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo ciclo Casa de Paz</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cdp-cycle-month">Mês</Label>
              <Input
                id="cdp-cycle-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cdp-cycle-name">Nome (opcional)</Label>
              <Input
                id="cdp-cycle-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Deixe em branco para gerar automaticamente"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!month || createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!closingId} onOpenChange={(open) => !open && setClosingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar este ciclo?</AlertDialogTitle>
            <AlertDialogDescription>
              Um ciclo encerrado não pode ser reaberto. Relatórios já enviados continuam vinculados a
              ele normalmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} disabled={closeMutation.isPending}>
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
