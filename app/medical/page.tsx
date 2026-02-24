"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppHeader } from "@/components/app-header"
import { StatCard } from "@/components/stat-card"
import { PriorityQueue } from "@/components/medical/priority-queue"
import { AdmittedPatients } from "@/components/medical/admitted-patients"
import { DoctorAppointments } from "@/components/medical/doctor-appointments"
import { useStats, useQueue, usePatients } from "@/hooks/use-hospital"
import { useAppointmentRequests } from "@/lib/appointment-store"
import { useAuth } from "@/hooks/use-auth"
import { Users, AlertTriangle, BedDouble, CalendarClock, Loader2 } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

export default function MedicalPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const user   = useAuth()
  const router = useRouter()
  const stats = useStats()
  const queue = useQueue()
  const patients = usePatients()
  const allAppts = useAppointmentRequests()
  const { t } = useTranslation()

  // Role guard
  useEffect(() => {
    if (!user) return
    if (user.role === "patient") { router.replace("/patient");   return }
    if (user.role === "nurse")   { router.replace("/nurse");     return }
    if (user.role === "admin")   { router.replace("/reception"); return }
  }, [user, router])

  const criticalCount = queue.filter(p => p.verifiedPriority === "critical").length
  const admittedCount = patients.filter(p => p.status === "admitted").length
  const doctorName    = user?.name ?? ""
  const myAppts       = doctorName
    ? allAppts.filter(a => a.doctorName.toLowerCase() === doctorName.toLowerCase())
    : allAppts
  const pendingAppts  = myAppts.filter(a => a.status === "pending").length

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center medical-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500">{t("common.loading")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen medical-bg">
      <AppHeader />
      <main className="mx-auto max-w-screen-2xl px-4 py-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("doctor.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("doctor.subtitle")}</p>
        </div>

        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title={t("doctor.statInQueue")}
            value={queue.length}
            subtitle={t("doctor.statInQueueSub")}
            icon={Users}
          />
          <StatCard
            title={t("doctor.statCritical")}
            value={criticalCount}
            subtitle={t("doctor.statCriticalSub")}
            icon={AlertTriangle}
            iconClassName={criticalCount > 0 ? "bg-red-100" : undefined}
          />
          <StatCard
            title={t("doctor.statAdmitted")}
            value={admittedCount}
            subtitle={t("doctor.statBedsSub", { count: stats.availableBeds })}
            icon={BedDouble}
          />
          <StatCard
            title={t("doctor.statAppts")}
            value={myAppts.length}
            subtitle={pendingAppts > 0 ? t("doctor.statApptsPending", { count: pendingAppts }) : t("doctor.statApptsNone")}
            icon={CalendarClock}
            iconClassName={pendingAppts > 0 ? "bg-sky-100" : undefined}
          />
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          <PriorityQueue />
          <div className="flex flex-col gap-6">
            <DoctorAppointments doctorNameFilter={doctorName || undefined} />
            <AdmittedPatients />
          </div>
        </div>
      </main>
    </div>
  )
}
