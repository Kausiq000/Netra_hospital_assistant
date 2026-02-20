import { cn } from "@/lib/utils"
import type { Priority } from "@/lib/types"

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  mild: { label: "Mild", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  moderate: { label: "Moderate", className: "bg-amber-100 text-amber-800 border-amber-200" },
  severe: { label: "Severe", className: "bg-orange-100 text-orange-800 border-orange-200" },
  critical: { label: "Critical", className: "bg-red-100 text-red-800 border-red-200" },
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const config = priorityConfig[priority]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
