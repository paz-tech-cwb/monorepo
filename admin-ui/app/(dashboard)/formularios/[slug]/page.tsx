import { FormListView } from "./form-list-view"
import type { FormSlug } from "@/lib/api/types/formularios"

const VALID: FormSlug[] = [
  "member-registrations",
  "form-conversions",
  "life-group-reports",
  "sector-supervisor-reports",
  "area-supervisor-reports",
  "multiplications",
  "service-reports",
  "form-guests",
]

export default async function FormPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!VALID.includes(slug as FormSlug)) {
    return <div className="p-6">Formulário não encontrado.</div>
  }
  return <FormListView slug={slug as FormSlug} />
}
