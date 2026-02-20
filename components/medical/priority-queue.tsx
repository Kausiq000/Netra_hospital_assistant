"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PriorityBadge } from "@/components/priority-badge"
import { useQueue } from "@/hooks/use-hospital"
import { verifyPatient, requestAdmission, emergencyOverride } from "@/lib/hospital-store"
import { Users, ShieldCheck, BedDouble, Zap, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Priority } from "@/lib/types"

const priorityBorderColor: Record<Priority, string> = {
  critical: "border-l-red-500",
  severe: "border-l-orange-500",
  moderate: "border-l-amber-500",
  mild: "border-l-emerald-500",
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

export function PriorityQueue() {
  const queue = useQueue()

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Live Priority Queue
          </CardTitle>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {queue.length} patients
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[520px]">
          <div className="flex flex-col gap-2">
            {queue.map((patient, index) => (
              <div
                key={patient.id}
                className={cn(
                  "rounded-lg border border-border/40 border-l-4 p-4 transition-all hover:bg-muted/30",
                  priorityBorderColor[patient.verifiedPriority]
                )}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{patient.name}</p>
                        <p className="text-xs text-muted-foreground">Token #{patient.tokenNumber} - Age {patient.age}</p>
                      </div>
                    </div>
                    <PriorityBadge priority={patient.verifiedPriority} />
                  </div>

                  <div className="rounded-md bg-muted/40 p-2.5">
                    <p className="text-xs font-medium text-muted-foreground">Symptoms</p>
                    <p className="mt-0.5 text-sm text-foreground">{patient.symptoms}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(patient.createdAt)}
                    </span>
                    <span className="capitalize">{patient.wardType} ward</span>
                    {patient.nurseVerified && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <ShieldCheck className="h-3 w-3" />
                        Verified
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!patient.nurseVerified && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          verifyPatient(patient.id)
                          toast.success(`${patient.name} verified`)
                        }}
                      >
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        Verify
                      </Button>
                    )}
                    {!patient.admissionRequested && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          requestAdmission(patient.id)
                          toast.success(`Admission requested for ${patient.name}`)
                        }}
                      >
                        <BedDouble className="mr-1 h-3 w-3" />
                        Request Admission
                      </Button>
                    )}
                    {patient.admissionRequested && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Admission Pending
                      </span>
                    )}
                    {patient.verifiedPriority !== "critical" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          emergencyOverride(patient.id)
                          toast.error(`EMERGENCY: ${patient.name} escalated to Critical`)
                        }}
                      >
                        <Zap className="mr-1 h-3 w-3" />
                        Emergency Override
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {queue.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="font-medium">No patients in queue</p>
                <p className="mt-1 text-xs">New patients will appear here as they register</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
