"use client"

import { memo, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "next-themes"
import {
  Home,
  Users,
  UserPlus,
  Bell,
  Building2,
  CalendarDays,
  Users2,
  BookOpen,
  Route,
  LogOut,
  Megaphone,
  GitBranch,
  ClipboardList,
  BarChart3,
  Sun,
  Moon,
  Waves,
  BookMarked,
  Network,
  Milestone,
  CalendarRange,
  BookText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/hooks/use-auth"
import type { AdminRole } from "@/lib/api/types"

// Leadership roles that can authenticate into admin-ui at all (enforced
// server-side in AuthService.socialLogin — see backend LEADERSHIP_ROLES).
// Per-item `roles` below is defense-in-depth: it hides admin-only areas
// (course tracks, courses writes) from the rest of leadership, it does not
// gate login itself.
const LEADERSHIP_ROLES: AdminRole[] = [
  "admin",
  "pastor",
  "area_leader",
  "sector_leader",
  "life_group_leader",
]

const sidebarSections = [
  {
    title: "Principal",
    items: [
      { name: "Inicio", href: "/dashboard", icon: Home },
      { name: "Membros", href: "/members", icon: Users, roles: LEADERSHIP_ROLES },
      { name: "Convidados", href: "/guests", icon: UserPlus, roles: LEADERSHIP_ROLES },
      { name: "Trilhos do Membro", href: "/journey-tracks", icon: Milestone, roles: LEADERSHIP_ROLES },
    ],
  },
  {
    title: "Igreja",
    items: [
      { name: "Organização", href: "/organizacao", icon: Network, roles: LEADERSHIP_ROLES },
      { name: "Organograma", href: "/organizacao/organograma", icon: GitBranch, roles: LEADERSHIP_ROLES },
      { name: "Registros Casa de Paz", href: "/casa-de-paz-registros", icon: ClipboardList, roles: LEADERSHIP_ROLES },
      { name: "Life Groups", href: "/life-groups", icon: Users2, roles: LEADERSHIP_ROLES },
      { name: "Ministérios", href: "/ministerios", icon: Waves, roles: LEADERSHIP_ROLES },
      { name: "Formulários", href: "/formularios", icon: ClipboardList, roles: LEADERSHIP_ROLES },
      { name: "Relatórios", href: "/relatorios", icon: BarChart3, roles: LEADERSHIP_ROLES },
      { name: "Ciclos Casa de Paz", href: "/casa-de-paz-ciclos", icon: CalendarRange, roles: LEADERSHIP_ROLES },
      { name: "Conteúdo Casa de Paz", href: "/casa-de-paz-conteudo", icon: BookText, roles: LEADERSHIP_ROLES },
    ],
  },
  {
    title: "Comunicação",
    items: [
      { name: "Notificações", href: "/notifications", icon: Bell, roles: LEADERSHIP_ROLES },
      { name: "Avisos", href: "/announcements", icon: Megaphone, roles: LEADERSHIP_ROLES },
      { name: "Calendário", href: "/events", icon: CalendarDays, roles: LEADERSHIP_ROLES },
    ],
  },
  {
    title: "Estudo",
    items: [
      { name: "Trilhos de Cursos", href: "/course-tracks", icon: Route, roles: ["admin"] as AdminRole[] },
      { name: "Cursos", href: "/courses", icon: BookOpen, roles: ["admin"] as AdminRole[] },
      { name: "Estudo do Life", href: "/estudo-do-life", icon: BookMarked, roles: LEADERSHIP_ROLES },
    ],
  },
  {
    title: "Configurações",
    items: [
      { name: "Dados da igreja", href: "/church-data", icon: Building2, roles: LEADERSHIP_ROLES },
    ],
  },
] as const

const NavItem = memo(function NavItem({
  href,
  icon: Icon,
  name,
  isActive
}: {
  href: string
  icon: typeof Home
  name: string
  isActive: boolean
}) {
  return (
    <Link
      href={href}
      prefetch={true}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {name}
    </Link>
  )
})

const NavSection = memo(function NavSection({
  section,
  pathname,
  role
}: {
  section: typeof sidebarSections[number]
  pathname: string
  role: AdminRole | "member" | "guest" | null
}) {
  const items = section.items as ReadonlyArray<{
    name: string
    href: string
    icon: typeof Home
    roles?: readonly AdminRole[]
  }>
  const visibleItems = items.filter((item) => {
    if (!item.roles) return true
    return !!role && (item.roles as readonly string[]).includes(role)
  })

  if (visibleItems.length === 0) return null

  return (
    <div>
      <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
        {section.title}
      </h3>
      <div className="space-y-1">
        {visibleItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            name={item.name}
            isActive={pathname === item.href}
          />
        ))}
      </div>
    </div>
  )
})

const ROLE_LABELS: Record<AdminRole | "member" | "guest", string> = {
  admin: "Admin",
  pastor: "Pastor",
  area_leader: "Líder de Área",
  sector_leader: "Líder de Setor",
  life_group_leader: "Líder de GV",
  discipler: "Discipulador",
  member: "Membro",
  guest: "Convidado",
}

function UserProfile() {
  const { user } = useAuth()
  if (!user) return null

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const role = user.role ?? "member"
  const roleLabel = ROLE_LABELS[role as AdminRole | "member" | "guest"] ?? role

  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={user.picture} alt={user.name} />
        <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-foreground text-xs font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
        <Badge variant="outline" className="mt-0.5 px-1.5 py-0 text-[10px] leading-4 text-sidebar-foreground/70 border-sidebar-foreground/20">
          {roleLabel}
        </Badge>
      </div>
    </div>
  )
}

function LogoutButton() {
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      className="w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
    >
      <LogOut className="mr-2 h-4 w-4" />
      Sair
    </Button>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-foreground shrink-0">
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  const isDark = theme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

export const SidebarContent = memo(function SidebarContent({ className }: { className?: string }) {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <div className={cn("flex h-full flex-col bg-sidebar border-r border-sidebar-border", className)}>
      <div data-sidebar-header className="flex h-14 items-center border-b border-sidebar-border px-4">
        <h2 className="flex-1 text-lg font-bold text-sidebar-primary tracking-tight">Painel Admin</h2>
        <ThemeToggle />
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-6 px-2">
          {sidebarSections.map((section) => (
            <NavSection
              key={section.title}
              section={section}
              pathname={pathname}
              role={user?.role ?? null}
            />
          ))}
        </nav>
      </div>
      <div className="border-t border-sidebar-border p-4 space-y-1">
        <UserProfile />
        <div className="pt-2">
          <LogoutButton />
        </div>
      </div>
    </div>
  )
})
