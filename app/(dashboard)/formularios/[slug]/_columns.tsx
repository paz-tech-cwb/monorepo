import type { FormSlug } from "@/lib/api/types/formularios"

export interface ColumnDef {
  key: string
  label: string
  format?: (v: unknown, row: Record<string, unknown>) => string
}

const fmt = {
  date: (v: unknown) => (v ? new Date(v as string).toLocaleDateString("pt-BR") : "—"),
  money: (v: unknown) =>
    v ? `R$ ${Number(v).toFixed(2).replace(".", ",")}` : "R$ 0,00",
  by: (_: unknown, row: Record<string, unknown>) =>
    (row.submitted_by as { name?: string })?.name ?? "—",
}

export const COLUMNS: Record<FormSlug, ColumnDef[]> = {
  "member-registrations": [
    { key: "full_name", label: "Nome" },
    { key: "email", label: "E-mail" },
    { key: "phone", label: "Telefone" },
    { key: "created_at", label: "Cadastrado em", format: fmt.date },
    { key: "submitted_by", label: "Por", format: fmt.by },
  ],
  "form-conversions": [
    { key: "full_name", label: "Nome" },
    { key: "decision_type", label: "Tipo" },
    { key: "created_at", label: "Data", format: fmt.date },
  ],
  "life-group-reports": [
    { key: "date", label: "Data", format: fmt.date },
    { key: "committed_members_present", label: "Presentes" },
    { key: "guests", label: "Convidados" },
    { key: "offering", label: "Oferta", format: fmt.money },
    { key: "submitted_by", label: "Líder", format: fmt.by },
  ],
  "sector-supervisor-reports": [
    { key: "date", label: "Data", format: fmt.date },
    { key: "meetings_held", label: "Reuniões" },
    { key: "trainings_conducted", label: "Treinamentos" },
    { key: "submitted_by", label: "Supervisor", format: fmt.by },
  ],
  "area-supervisor-reports": [
    { key: "date", label: "Data", format: fmt.date },
    { key: "meetings_held", label: "Reuniões" },
    { key: "submitted_by", label: "Supervisor", format: fmt.by },
  ],
  "multiplications": [
    { key: "date", label: "Data", format: fmt.date },
    { key: "new_life_group_name", label: "Nova LG" },
    { key: "submitted_by", label: "Supervisor", format: fmt.by },
  ],
  "service-reports": [
    { key: "date", label: "Data", format: fmt.date },
    { key: "service_type", label: "Tipo" },
    { key: "total_attendance", label: "Presentes" },
    { key: "offering", label: "Oferta", format: fmt.money },
  ],
  "form-guests": [
    { key: "full_name", label: "Nome" },
    { key: "phone", label: "Telefone" },
    { key: "invited_by", label: "Convidado por" },
    { key: "created_at", label: "Data", format: fmt.date },
  ],
}
