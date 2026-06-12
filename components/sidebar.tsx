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
  Bell,
  Building2,
  CalendarDays,
  Users2,
  BookOpen,
  Route,
  LogOut,
  Megaphone,
  GitMerge,
  ClipboardList,
  Sun,
  Moon,
  Waves,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/hooks/use-auth"
import type { AdminRole } from "@/lib/api/types"

const sidebarSections = [
  {
    title: "Principal",
    items: [
      { name: "Inicio", href: "/dashboard", icon: Home },
      { name: "Membros", href: "/members", icon: Users },
      { name: "Jornada", href: "/member-journey", icon: GitMerge },
    ],
  },
  {
    title: "Igreja",
    items: [
      { name: "Life Groups", href: "/life-groups", icon: Users2 },
      { name: "Ministérios", href: "/ministerios", icon: Waves },
      { name: "Formulários", href: "/formularios", icon: ClipboardList },
    ],
  },
  {
    title: "Comunicação",
    items: [
      { name: "Notificações", href: "/notifications", icon: Bell },
      { name: "Avisos", href: "/announcements", icon: Megaphone },
      { name: "Calendário", href: "/events", icon: CalendarDays },
    ],
  },
  {
    title: "Estudo",
    items: [
      { name: "Trilhos", href: "/course-tracks", icon: Route },
      { name: "Cursos", href: "/courses", icon: BookOpen },
    ],
  },
  {
    title: "Configurações",
    items: [
      { name: "Dados da igreja", href: "/church-data", icon: Building2 },
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
  pathname
}: {
  section: typeof sidebarSections[number]
  pathname: string
}) {
  return (
    <div>
      <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
        {section.title}
      </h3>
      <div className="space-y-1">
        {section.items.map((item) => (
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

const ROLE_LABELS: Record<AdminRole | "member", string> = {
  admin: "Admin",
  pastor: "Pastor",
  area_leader: "Líder de Área",
  sector_leader: "Líder de Setor",
  life_group_leader: "Líder de GV",
  member: "Membro",
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
  const roleLabel = ROLE_LABELS[role as AdminRole | "member"] ?? role

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

export const SidebarContent = memo(function SidebarContent() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
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
