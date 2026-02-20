"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PriorityBadge } from "@/components/priority-badge"
import { usePatientByToken } from "@/hooks/use-hospital"
import { Hash, Clock, Users, BedDouble, ArrowLeft, QrCode } from "lucide-react"

interface PatientStatusProps {
  tokenNumber: number
  onBack: () => void
}

export function PatientStatus({ tokenNumber, onBack }: PatientStatusProps) {
  const patient = usePatientByToken(tokenNumber)

  if (!patient) {
    return (
      <Card className="w-full max-w-lg border-border/60">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <QrCode className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="text-lg font-semibold text-foreground">Token Not Found</p>
            <p className="mt-1 text-sm text-muted-foreground">No patient found with token #{tokenNumber}</p>
          </div>
          <Button variant="outline" onClick={onBack} className="mt-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    )
  }

  const isAdmitted = patient.status === "admitted"
  const isDischarged = patient.status === "discharged"

  return (
    <div className="flex w-full max-w-lg flex-col gap-4">
      <Button variant="ghost" onClick={onBack} className="w-fit text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Registration
      </Button>

      {/* Token Card */}
      <Card className="overflow-hidden border-border/60">
        <div className="bg-primary px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-foreground/80">Your Token Number</p>
              <p className="text-4xl font-bold tracking-tight text-primary-foreground">#{patient.tokenNumber}</p>
            </div>
            <div className="rounded-xl bg-primary-foreground/20 p-3">
              <Hash className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Patient Name</span>
              <span className="font-medium text-foreground">{patient.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Priority Status</span>
              <PriorityBadge priority={patient.verifiedPriority} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Status</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold capitalize text-foreground">
                {patient.status === "in-queue" ? "In Queue" : patient.status}
              </span>
            </div>
            {patient.nurseVerified && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nurse Verified</span>
                <span className="text-sm font-medium text-emerald-600">Verified</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Queue Position */}
      {!isAdmitted && !isDischarged && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Queue Position
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-foreground">{patient.queuePosition}</p>
                <p className="text-sm text-muted-foreground">Position in queue</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Estimated wait</span>
                </div>
                <p className="text-xl font-semibold text-foreground">{patient.estimatedWaitTime} min</p>
              </div>
            </div>
            <Progress value={Math.max(5, 100 - (patient.queuePosition * 12))} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Queue positions update automatically as priorities change
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bed Assignment */}
      {isAdmitted && patient.bedId && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-emerald-800">
              <BedDouble className="h-4 w-4" />
              Bed Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-800">Bed {patient.bedId.replace("bed-", "").toUpperCase()}</p>
            <p className="mt-1 text-sm text-emerald-700">You have been admitted. Please proceed to your assigned bed.</p>
          </CardContent>
        </Card>
      )}

      {/* Discharged */}
      {isDischarged && (
        <Card className="border-muted bg-muted/50">
          <CardContent className="p-6 text-center">
            <p className="text-lg font-semibold text-foreground">Discharged</p>
            <p className="mt-1 text-sm text-muted-foreground">Thank you for visiting. We wish you a speedy recovery.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
