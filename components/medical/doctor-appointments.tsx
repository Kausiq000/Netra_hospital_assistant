"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAppointmentRequests, type AppointmentRequest } from "@/lib/appointment-store"
import { CalendarClock, Clock, CheckCircle2, XCircle, Hourglass, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n"

interface Props {
  /** If provided, only show appointments for this doctor name (case-insensitive match) */
  doctorNameFilter?: string
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> {t("dappt.approved")}
      </span>
    )
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600 border border-red-200">
        <XCircle className="h-3 w-3" /> {t("dappt.rejected")}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
      <Hourglass className="h-3 w-3" /> {t("dappt.pendingBadge")}
    </span>
  )
}

function useTimeAgo() {
  const { t } = useTranslation()
  return (d: Date) => {
    const m = Math.floor((Date.now() - d.getTime()) / 60000)
    if (m < 1) return t("common.justNow")
    if (m < 60) return t("common.mAgo", { m })
    return t("common.hAgo", { h: Math.floor(m / 60) })
  }
}

export function DoctorAppointments({ doctorNameFilter }: Props) {
  const allRequests = useAppointmentRequests()
  const { t } = useTranslation()
  const timeAgo = useTimeAgo()

  // Filter: if doctorNameFilter provided, match case-insensitively
  const requests: AppointmentRequest[] = doctorNameFilter
    ? allRequests.filter(r => r.doctorName.toLowerCase() === doctorNameFilter.toLowerCase())
    : allRequests

  const pending  = requests.filter(r => r.status === "pending")
  const approved = requests.filter(r => r.status === "approved")
  const rejected = requests.filter(r => r.status === "rejected")

  // Show approved first, then pending, then rejected
  const sorted = [...approved, ...pending, ...rejected]

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-sky-600" />
            {doctorNameFilter ? t("dappt.myTitle") : t("dappt.allTitle")}
          </CardTitle>
          <div className="flex items-center gap-2">
            {pending.length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                {t("common.pending", { count: pending.length })}
              </Badge>
            )}
            {approved.length > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                {t("dappt.confirmed", { count: approved.length })}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[420px]">
          <div className="flex flex-col gap-2">
            {sorted.map((req) => (
              <div
                key={req.id}
                className={cn(
                  "rounded-lg border p-4 transition-colors",
                  req.status === "approved"
                    ? "border-emerald-200 bg-emerald-50/50"
                    : req.status === "pending"
                    ? "border-amber-200 bg-amber-50/40"
                    : "border-slate-200 bg-slate-50/30 opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="flex items-center gap-1 text-sm font-semibold text-slate-800">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {req.patientName}
                      </span>
                      <StatusBadge status={req.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {req.slot}
                      </span>
                      {!doctorNameFilter && (
                        <span className="font-medium text-slate-600">
                          Dr. {req.doctorName} · {req.specialty}
                        </span>
                      )}
                      {doctorNameFilter && (
                        <span className="text-slate-400">{req.specialty}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {timeAgo(req.requestedAt)}
                  </span>
                </div>
              </div>
            ))}

            {sorted.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <CalendarClock className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="font-medium">{t("dappt.empty")}</p>
                <p className="mt-1 text-xs">{t("dappt.emptyHint")}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
