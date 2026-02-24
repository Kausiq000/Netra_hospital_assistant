"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useStats, usePatients, useQueue, useLogs } from "@/hooks/use-hospital"
import {
  BedDouble,
  Users,
  Activity,
  AlertTriangle,
  ArrowRight,
  Stethoscope,
  ClipboardList,
  Clock,
  TrendingUp,
  Loader2,
  HeartPulse,
  ShieldCheck,
} from "lucide-react"
import { PriorityBadge } from "@/components/priority-badge"
import { cn } from "@/lib/utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

function formatTimeAgo(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  if (diff < 0) return "Just now"
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const stats = useStats()
  const patients = usePatients()
  const queue = useQueue()
  const logs = useLogs()

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const inQueueCount = patients.filter(p => p.status === "in-queue").length
  const admittedCount = patients.filter(p => p.status === "admitted").length
  const criticalCount = queue.filter(p => p.verifiedPriority === "critical").length

  const wardData = [
    { name: "General", occupied: stats.generalBeds.total - stats.generalBeds.available, available: stats.generalBeds.available },
    { name: "Emergency", occupied: stats.emergencyBeds.total - stats.emergencyBeds.available, available: stats.emergencyBeds.available },
    { name: "ICU", occupied: stats.icuBeds.total - stats.icuBeds.available, available: stats.icuBeds.available },
  ]

  const roleCards = [
    {
      title: "Patient Portal",
      description: "Register, get a token, and track your queue position in real time",
      icon: ClipboardList,
      href: "/patient",
      color: "bg-emerald-500",
    },
    {
      title: "Nurse Station",
      description: "Review live token list, update priority and status, and escalate cases",
      icon: HeartPulse,
      href: "/nurse",
      color: "bg-blue-500",
    },
    {
      title: "Doctor Console",
      description: "Structured patient summaries, admission requests, Emergency Override",
      icon: Stethoscope,
      href: "/doctor",
      color: "bg-amber-500",
    },
    {
      title: "Admin Command Center",
      description: "Bed management, admission approvals, analytics, and surge alerts",
      icon: ShieldCheck,
      href: "/reception",
      color: "bg-violet-500",
    },
  ]

  return (
    <div className="min-h-screen" style={{ background: "#F4FFF8" }}>
      <AppHeader />
      <main className="mx-auto max-w-screen-2xl px-4 py-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hospital Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time capacity and patient flow management — NETRA Command Center
          </p>
        </div>

        {/* Surge Alert */}
        {stats.surgeMode && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">Surge Mode Active</p>
                <p className="text-sm text-red-700">
                  Hospital occupancy has exceeded {stats.surgeThreshold}%. Consider diverting non-critical cases to nearby facilities.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title="Total Beds" value={stats.totalBeds} subtitle={`${stats.availableBeds} available`} icon={BedDouble} />
          <StatCard title="Patients in Queue" value={inQueueCount} subtitle="Waiting for care" icon={Users} />
          <StatCard title="Occupancy Rate" value={`${stats.occupancyRate}%`} subtitle={`${admittedCount} admitted`} icon={TrendingUp} />
          <StatCard title="Critical Cases" value={criticalCount} subtitle="Immediate attention" icon={AlertTriangle} iconClassName={criticalCount > 0 ? "bg-red-100" : undefined} />
        </div>

        {/* Role Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {roleCards.map((card) => (
            <Link key={card.href} href={card.href}>
              <Card className="group cursor-pointer border-blue-100 bg-white transition-all hover:border-blue-200 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={cn("rounded-xl p-2.5", card.color)}>
                      <card.icon className="h-5 w-5 text-white" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-800">{card.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Bottom Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Ward Chart */}
          <Card className="border-blue-100 bg-white lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                <Activity className="h-4 w-4 text-blue-600" />
                Ward Occupancy Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wardData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} />
                    <Bar dataKey="occupied" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Occupied" />
                    <Bar dataKey="available" fill="#10b981" radius={[4, 4, 0, 0]} name="Available" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {wardData.map((ward) => {
                  const total = ward.occupied + ward.available
                  const pct = Math.round((ward.occupied / total) * 100)
                  return (
                    <div key={ward.name} className="flex items-center gap-3">
                      <span className="w-20 text-xs font-medium text-slate-500">{ward.name}</span>
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="w-12 text-right text-xs font-semibold text-slate-700">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            <Card className="border-blue-100 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-slate-800">
                  <Users className="h-4 w-4 text-blue-600" />
                  Next in Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {queue.slice(0, 4).map((patient, i) => (
                    <div key={patient.id} className="flex items-center justify-between rounded-lg border border-blue-50 bg-blue-50/30 p-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{patient.name}</p>
                          <p className="text-xs text-slate-400">#{patient.tokenNumber}</p>
                        </div>
                      </div>
                      <PriorityBadge priority={patient.verifiedPriority} />
                    </div>
                  ))}
                  {queue.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Queue is empty</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-100 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm text-slate-800">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2.5">
                  {logs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-start gap-2">
                      <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                      <div>
                        <p className="text-xs font-medium text-slate-700">{log.action}</p>
                        <p className="text-xs text-slate-400">{formatTimeAgo(log.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
