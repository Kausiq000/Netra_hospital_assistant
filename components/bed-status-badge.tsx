"use client"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n"
import type { BedStatus } from "@/lib/types"

const statusConfig: Record<BedStatus, { labelKey: string; className: string; dot: string }> = {
  available: { labelKey: "common.available", className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  occupied: { labelKey: "common.occupied", className: "bg-primary/10 text-primary border-primary/20", dot: "bg-primary" },
  cleaning: { labelKey: "common.cleaning", className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  maintenance: { labelKey: "common.maintenance", className: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
}

export function BedStatusBadge({ status, className }: { status: BedStatus; className?: string }) {
  const { t } = useTranslation()
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {t(config.labelKey)}
    </span>
  )
}
