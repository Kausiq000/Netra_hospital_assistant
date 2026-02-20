"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Activity, Users, Stethoscope, LayoutDashboard, AlertTriangle } from "lucide-react"
import { useStats } from "@/hooks/use-hospital"

const navigation = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Patient", href: "/patient", icon: Users },
  { name: "Reception", href: "/reception", icon: Activity },
  { name: "Medical Staff", href: "/medical", icon: Stethoscope },
]

export function AppHeader() {
  const pathname = usePathname()
  const stats = useStats()

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">MedFlow</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {stats.surgeMode && (
            <div className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5" />
              Surge Mode Active
            </div>
          )}
          <div className="hidden items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground sm:flex">
            <span className={cn("h-2 w-2 rounded-full", stats.occupancyRate >= 85 ? "bg-red-500" : stats.occupancyRate >= 70 ? "bg-amber-500" : "bg-emerald-500")} />
            {stats.occupancyRate}% Occupancy
          </div>
        </div>
      </div>
    </header>
  )
}
