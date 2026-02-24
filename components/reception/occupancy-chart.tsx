"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useStats, useBeds } from "@/hooks/use-hospital"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"
import { BarChart3 } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

export function OccupancyChart() {
  const stats = useStats()
  const beds = useBeds()
  const { t } = useTranslation()

  const barData = [
    {
      name: t("common.general"),
      total: stats.generalBeds.total,
      available: stats.generalBeds.available,
      occupied: stats.generalBeds.total - stats.generalBeds.available,
    },
    {
      name: t("common.emergency"),
      total: stats.emergencyBeds.total,
      available: stats.emergencyBeds.available,
      occupied: stats.emergencyBeds.total - stats.emergencyBeds.available,
    },
    {
      name: t("common.icu"),
      total: stats.icuBeds.total,
      available: stats.icuBeds.available,
      occupied: stats.icuBeds.total - stats.icuBeds.available,
    },
  ]

  const statusCounts = beds.reduce((acc, bed) => {
    acc[bed.status] = (acc[bed.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pieData = [
    { name: t("common.available"), value: statusCounts.available || 0, color: "#10b981" },
    { name: t("common.occupied"), value: statusCounts.occupied || 0, color: "#3b82f6" },
    { name: t("common.cleaning"), value: statusCounts.cleaning || 0, color: "#f59e0b" },
    { name: t("common.maintenance"), value: statusCounts.maintenance || 0, color: "#94a3b8" },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            {t("chart.wardOccupancy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="occupied" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name={t("common.occupied")} />
                <Bar dataKey="available" fill="#10b981" radius={[4, 4, 0, 0]} name={t("common.available")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            {t("chart.bedDistribution")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="h-64 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2.5">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                  <span className="text-xs font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
