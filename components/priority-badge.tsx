"use client"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n"
import type { Priority } from "@/lib/types"

const priorityConfig: Record<Priority, { labelKey: string; className: string }> = {
  mild: { labelKey: "common.mild", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  moderate: { labelKey: "common.moderate", className: "bg-amber-100 text-amber-800 border-amber-200" },
  severe: { labelKey: "common.severe", className: "bg-orange-100 text-orange-800 border-orange-200" },
  critical: { labelKey: "common.critical", className: "bg-red-100 text-red-800 border-red-200" },
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const { t } = useTranslation()
  const config = priorityConfig[priority]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        config.className,
        className
      )}
    >
      {t(config.labelKey)}
    </span>
  )
}
