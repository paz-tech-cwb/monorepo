"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, UserCheck, Users2, TrendingUp, Bell, Calendar, BarChart3 } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { useDashboardStats, useAccessTrends, useMemberGrowth, useLifeGroupDistribution } from "@/lib/hooks/use-dashboard"
import { StatsCardSkeleton } from "@/components/ui/skeleton-components"
import { Skeleton } from "@/components/ui/skeleton"

const PIE_COLORS = ["#15803d", "#84cc16", "#d97706", "#3b82f6", "#8b5cf6", "#ec4899"]

export function DashboardHome() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: accessTrends, isLoading: trendsLoading } = useAccessTrends()
  const { data: memberGrowth, isLoading: growthLoading } = useMemberGrowth()
  const { data: lifeGroupDist, isLoading: lifeGroupsLoading } = useLifeGroupDistribution()

  const accessChartData = (accessTrends || []).map((item) => ({
    name: item.date,
    acessos: item.access_count,
  }))

  const memberGrowthChartData = (memberGrowth || []).map((item) => ({
    name: item.month,
    membros: item.total_members,
  }))

  const lifeGroupsChartData = (lifeGroupDist || []).map((item, index) => ({
    name: item.name,
    value: item.member_count,
    color: PIE_COLORS[index % PIE_COLORS.length],
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Inicio</h1>
        <p className="text-muted-foreground">Visao geral do sistema de gerenciamento da igreja</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Membros</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_members?.toLocaleString() ?? "-"}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats?.new_members_this_month ?? 0} novos este mes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Membros Ativos</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.active_members?.toLocaleString() ?? "-"}</div>
                <p className="text-xs text-muted-foreground">Membros com status ativo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Life Groups</CardTitle>
                <Users2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total_life_groups ?? "-"}</div>
                <p className="text-xs text-muted-foreground">Grupos cadastrados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eventos este Mes</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.events_this_month ?? "-"}</div>
                <p className="text-xs text-muted-foreground">Eventos programados</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Access Chart */}
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle>Numero de Acessos</CardTitle>
            <CardDescription>Acessos ao app nos ultimos meses</CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={accessChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area type="monotone" dataKey="acessos" stroke="#15803d" fill="#84cc16" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Life Groups Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuicao Life Groups</CardTitle>
            <CardDescription>Grupos por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            {lifeGroupsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={lifeGroupsChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {lifeGroupsChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {lifeGroupsChartData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Member Growth Chart */}
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Crescimento de Membros</CardTitle>
            <CardDescription>Evolucao do numero de membros da igreja</CardDescription>
          </CardHeader>
          <CardContent>
            {growthLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={memberGrowthChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="membros" fill="#15803d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Enviar Notificacao
            </CardTitle>
            <CardDescription>Envie notificacoes push para todos os usuarios do app</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Criar Notificacao</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Proximos Eventos
            </CardTitle>
            <CardDescription>Gerencie os proximos eventos da igreja</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Culto Dominical</span>
                <Badge variant="secondary">Domingo</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Reuniao de Oracao</span>
                <Badge variant="secondary">Quarta</Badge>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4 bg-transparent">
              Ver Todos
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Relatorios
            </CardTitle>
            <CardDescription>Visualize estatisticas e relatorios detalhados</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full bg-transparent">
              Gerar Relatorio
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>Ultimas acoes realizadas no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Novo membro adicionado</p>
                <p className="text-xs text-muted-foreground">Joao Silva foi adicionado aos membros - ha 2 horas</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Evento criado</p>
                <p className="text-xs text-muted-foreground">
                  Retiro de Jovens foi agendado para proximo mes - ha 4 horas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-chart-3 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Notificacao enviada</p>
                <p className="text-xs text-muted-foreground">Lembrete do culto enviado para 856 membros - ha 6 horas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
