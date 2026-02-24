"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BedStatusBadge } from "@/components/bed-status-badge"
import { useBeds } from "@/hooks/use-hospital"
import { updateBedStatus } from "@/lib/hospital-store"
import type { BedStatus, BedType } from "@/lib/types"
import { BedDouble } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n"

export function BedGrid() {
  const beds = useBeds()
  const [filterType, setFilterType] = useState<BedType | "all">("all")
  const [filterStatus, setFilterStatus] = useState<BedStatus | "all">("all")
  const { t } = useTranslation()

  const filtered = beds.filter(b => {
    if (filterType !== "all" && b.type !== filterType) return false
    if (filterStatus !== "all" && b.status !== filterStatus) return false
    return true
  })

  const groupedByType = filtered.reduce((acc, bed) => {
    if (!acc[bed.type]) acc[bed.type] = []
    acc[bed.type].push(bed)
    return acc
  }, {} as Record<string, typeof beds>)

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BedDouble className="h-4 w-4 text-primary" />
            {t("bedGrid.title")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={(v) => setFilterType(v as BedType | "all")}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder={t("bedGrid.wardFilter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("bedGrid.allWards")}</SelectItem>
                <SelectItem value="general">{t("common.general")}</SelectItem>
                <SelectItem value="emergency">{t("common.emergency")}</SelectItem>
                <SelectItem value="icu">{t("common.icu")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as BedStatus | "all")}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder={t("bedGrid.statusFilter")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("bedGrid.allStatus")}</SelectItem>
                <SelectItem value="available">{t("common.available")}</SelectItem>
                <SelectItem value="occupied">{t("common.occupied")}</SelectItem>
                <SelectItem value="cleaning">{t("common.cleaning")}</SelectItem>
                <SelectItem value="maintenance">{t("common.maintenance")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          {Object.entries(groupedByType).map(([type, typeBeds]) => (
            <div key={type}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">{t("bedGrid.wardFloor", { ward: t(`common.${type}`), floor: typeBeds[0]?.floor })}</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {typeBeds.map((bed) => (
                  <div
                    key={bed.id}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      bed.status === "available" && "border-emerald-200 bg-emerald-50/50",
                      bed.status === "occupied" && "border-primary/20 bg-primary/5",
                      bed.status === "cleaning" && "border-amber-200 bg-amber-50/50",
                      bed.status === "maintenance" && "border-border bg-muted/50",
                    )}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">{bed.number}</span>
                      </div>
                      <BedStatusBadge status={bed.status} />
                      <Select
                        value={bed.status}
                        onValueChange={async (v) => updateBedStatus(bed.id, v as BedStatus)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">{t("common.available")}</SelectItem>
                          <SelectItem value="occupied">{t("common.occupied")}</SelectItem>
                          <SelectItem value="cleaning">{t("common.cleaning")}</SelectItem>
                          <SelectItem value="maintenance">{t("common.maintenance")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
