"use client"

import { AppHeader } from "@/components/app-header"
import { StatCard } from "@/components/stat-card"
import { BedGrid } from "@/components/reception/bed-grid"
import { PatientManagement } from "@/components/reception/patient-management"
import { OccupancyChart } from "@/components/reception/occupancy-chart"
import { ActivityLog } from "@/components/reception/activity-log"
import { useStats, usePatients } from "@/hooks/use-hospital"
import { BedDouble, Users, AlertTriangle, Activity } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ReceptionPage() {
  const stats = useStats()
  const patients = usePatients()
  const inQueueCount = patients.filter(p => p.status === "in-queue").length
  const admittedCount = patients.filter(p => p.status === "admitted").length

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-screen-2xl px-4 py-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reception Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage patient flow, bed allocation, and hospital capacity</p>
        </div>

        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Total Beds"
            value={stats.totalBeds}
            subtitle={`${stats.availableBeds} available`}
            icon={BedDouble}
          />
          <StatCard
            title="In Queue"
            value={inQueueCount}
            subtitle="Waiting patients"
            icon={Users}
          />
          <StatCard
            title="Admitted"
            value={admittedCount}
            subtitle={`${stats.occupancyRate}% occupancy`}
            icon={Activity}
          />
          <StatCard
            title="ICU Available"
            value={stats.icuBeds.available}
            subtitle={`of ${stats.icuBeds.total} ICU beds`}
            icon={AlertTriangle}
            iconClassName={stats.icuBeds.available === 0 ? "bg-red-100" : undefined}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="patients" className="flex flex-col gap-6">
          <TabsList className="w-fit">
            <TabsTrigger value="patients">Patient Management</TabsTrigger>
            <TabsTrigger value="beds">Bed Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="patients">
            <PatientManagement />
          </TabsContent>

          <TabsContent value="beds">
            <BedGrid />
          </TabsContent>

          <TabsContent value="analytics">
            <OccupancyChart />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityLog />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
