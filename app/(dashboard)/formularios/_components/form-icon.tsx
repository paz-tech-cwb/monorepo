import {
  UserPlus,
  HeartHandshake,
  Users2,
  ClipboardCheck,
  BarChart3,
  GitBranch,
  Church,
  UserPlus2,
} from "lucide-react"
import type { FormSlug } from "@/lib/api/types/formularios"

const ICONS: Record<FormSlug, React.ComponentType<{ className?: string }>> = {
  "member-registrations": UserPlus,
  "form-conversions": HeartHandshake,
  "life-group-reports": Users2,
  "sector-supervisor-reports": ClipboardCheck,
  "area-supervisor-reports": BarChart3,
  "multiplications": GitBranch,
  "service-reports": Church,
  "form-guests": UserPlus2,
}

export function FormIcon({ slug, className }: { slug: FormSlug; className?: string }) {
  const Icon = ICONS[slug]
  return <Icon className={className} />
}
