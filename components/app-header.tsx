"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Users,
  Stethoscope,
  LayoutDashboard,
  AlertTriangle,
  HeartPulse,
  ShieldCheck,
  LogOut,
  Languages,
} from "lucide-react"
import { useStats } from "@/hooks/use-hospital"
import { useAuth } from "@/hooks/use-auth"
import { logout } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"

const NAV_KEYS: Record<string, string> = {
  Overview: "header.overview",
  Patient: "header.patient",
  Nurse: "header.nurse",
  Doctor: "header.doctor",
  Admin: "header.admin",
}

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { name: "Patient", href: "/patient", icon: Users, roles: ["patient", "admin"] },
  { name: "Nurse", href: "/nurse", icon: HeartPulse, roles: ["nurse", "admin"] },
  { name: "Doctor", href: "/doctor", icon: Stethoscope, roles: ["doctor", "admin"] },
  { name: "Admin", href: "/reception", icon: ShieldCheck, roles: ["admin"] },
]

export function AppHeader() {
  const pathname = usePathname()
  const stats = useStats()
  const user = useAuth()
  const router = useRouter()
  const { t, lang, setLang } = useTranslation()

  const visibleNav = user
    ? navigation.filter((n) => n.roles.includes(user.role))
    : []

  return (
    <header className="sticky top-0 z-50 border-b border-violet-100 bg-white/90 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 lg:px-8">
        
        {/* LEFT SIDE */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/Netralogo.png"
              alt="NETRA Logo"
              width={36}
              height={36}
              className="h-9 w-9 object-contain shrink-0"
              priority
            />
            <span
              className="text-xl font-black tracking-tight leading-none"
              style={{
                fontFamily: "var(--font-rajdhani), 'Rajdhani', sans-serif",
                background: "linear-gradient(135deg, #6c47ff 0%, #00c896 55%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              NETRA
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {visibleNav.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-violet-50 text-violet-700"
                      : "text-slate-500 hover:bg-[#F4FFF8] hover:text-slate-800"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {t(NAV_KEYS[item.name] ?? item.name)}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === "en" ? "ta" : "en")}
            className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-50"
            title={t("lang.switch")}
          >
            <Languages className="h-3.5 w-3.5" />
            {lang === "en" ? "தமிழ்" : "English"}
          </button>

          {stats.surgeMode && (
            <div className="flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("common.surgeMode")}
            </div>
          )}

          <div className="hidden items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 sm:flex">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                stats.occupancyRate >= 85
                  ? "bg-red-500"
                  : stats.occupancyRate >= 70
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              )}
            />
            {t("common.occupancy", { rate: stats.occupancyRate })}
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs font-medium text-slate-500 sm:block capitalize">
                {t("header.roleUser", { role: t(`header.${user.role}`), name: user.name })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                onClick={async () => {
                  await logout()
                  router.push("/login")
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}