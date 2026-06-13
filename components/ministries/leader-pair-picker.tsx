"use client"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface UserOption { id: number; name: string }

interface LeaderPairPickerProps {
  users: UserOption[]
  leaderId: number | null
  coLeaderId: number | null
  onLeaderChange: (id: number | null) => void
  onCoLeaderChange: (id: number | null) => void
  leaderLabel?: string
  coLeaderLabel?: string
}

const NONE = "none"

export function LeaderPairPicker({
  users, leaderId, coLeaderId, onLeaderChange, onCoLeaderChange,
  leaderLabel = "Líder", coLeaderLabel = "Co-líder (cônjuge)",
}: LeaderPairPickerProps) {
  const toVal = (id: number | null) => (id == null ? NONE : String(id))
  const parse = (v: string) => (v === NONE ? null : Number(v))
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label>{leaderLabel}</Label>
        <Select value={toVal(leaderId)} onValueChange={(v) => onLeaderChange(parse(v))}>
          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={String(u.id)} disabled={u.id === coLeaderId}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>{coLeaderLabel}</Label>
        <Select value={toVal(coLeaderId)} onValueChange={(v) => onCoLeaderChange(parse(v))}>
          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={String(u.id)} disabled={u.id === leaderId}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
