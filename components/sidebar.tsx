"use client"

import { memo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/hooks/use-auth"

const sidebarSections = [
  {
    title: "Principal",
    items: [
      { name: "Inicio", href: "/dashboard", icon: Home },
      { name: "Membros", href: "/members", icon: Users },
      { name: "Life groups", href: "/life-groups", icon: Users2 },
    ],
  },
  {
    title: "Comunicacao",
    items: [
      { name: "Notificacoes", href: "/notifications", icon: Bell },
      { name: "Avisos", href: "/announcements", icon: Megaphone },
    ],
  },
  {
    title: "Eventos",
    items: [
      { name: "Calendario", href: "/events", icon: CalendarDays },
    ],
  },
  {
    title: "Estudo",
    items: [
      { name: "Trilhos", href: "/course-tracks", icon: Route },
      { name: "Cursos", href: "/courses", icon: BookOpen }
    ],
  },
  {
    title: "Configuracoes",
    items: [
      { name: "Dados da igreja", href: "/church-data", icon: Building2 },
    ],
  },
] as const

// Memoized nav item to prevent unnecessary re-renders
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
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-primary/60 hover:text-white/100",
      )}
    >
      <Icon className="h-4 w-4" />
      {name}
    </Link>
  )
})

// Memoized section component
const NavSection = memo(function NavSection({
  section,
  pathname
}: {
  section: typeof sidebarSections[number]
  pathname: string
}) {
  return (
    <div>
      <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
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

function LogoutButton() {
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    // Redirect handled by auth context
  }

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-primary/80 hover:text-white/80"
    >
      <LogOut className="mr-2 h-4 w-4" />
      Sair
    </Button>
  )
}

export const SidebarContent = memo(function SidebarContent() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <h2 className="text-lg font-semibold text-sidebar-foreground">Painel Admin</h2>
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
      <div className="border-t border-sidebar-border p-4">
        <LogoutButton />
      </div>
    </div>
  )
})
