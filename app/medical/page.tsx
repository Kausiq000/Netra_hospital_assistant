"use client"

import { useState, useEffect } from "react"
import { AppHeader } from "@/components/app-header"
import { StatCard } from "@/components/stat-card"
import { PriorityQueue } from "@/components/medical/priority-queue"
import { AdmittedPatients } from "@/components/medical/admitted-patients"
import { useStats, useQueue, usePatients } from "@/hooks/use-hospital"
import { Users, AlertTriangle, BedDouble, Stethoscope, Loader2 } from "lucide-react"

export default function MedicalPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const stats = useStats()
  const queue = useQueue()
  const patients = usePatients()
  const criticalCount = queue.filter(p => p.verifiedPriority === "critical").length
  const admittedCount = patients.filter(p => p.status === "admitted").length
  const pendingAdmission = patients.filter(p => p.admissionRequested && p.status === "in-queue").length

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-screen-2xl px-4 py-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Medical Staff Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitor patient queue, manage admissions, and coordinate care</p>
        </div>

        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="In Queue"
            value={queue.length}
            subtitle="Waiting patients"
            icon={Users}
          />
          <StatCard
            title="Critical"
            value={criticalCount}
            subtitle="Immediate attention"
            icon={AlertTriangle}
            iconClassName={criticalCount > 0 ? "bg-red-100" : undefined}
          />
          <StatCard
            title="Admitted"
            value={admittedCount}
            subtitle={`${stats.availableBeds} beds available`}
            icon={BedDouble}
          />
          <StatCard
            title="Pending Admission"
            value={pendingAdmission}
            subtitle="Awaiting bed assignment"
            icon={Stethoscope}
          />
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          <PriorityQueue />
          <AdmittedPatients />
        </div>
      </main>
    </div>
  )
}
