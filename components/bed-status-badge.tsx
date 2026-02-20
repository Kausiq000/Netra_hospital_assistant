import { cn } from "@/lib/utils"
import type { BedStatus } from "@/lib/types"

const statusConfig: Record<BedStatus, { label: string; className: string; dot: string }> = {
  available: { label: "Available", className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  occupied: { label: "Occupied", className: "bg-primary/10 text-primary border-primary/20", dot: "bg-primary" },
  cleaning: { label: "Cleaning", className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  maintenance: { label: "Maintenance", className: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
}

export function BedStatusBadge({ status, className }: { status: BedStatus; className?: string }) {
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
      {config.label}
    </span>
  )
}
