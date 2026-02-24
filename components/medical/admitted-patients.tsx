"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PriorityBadge } from "@/components/priority-badge"
import { usePatients, useBeds } from "@/hooks/use-hospital"
import { dischargePatient } from "@/lib/hospital-store"
import { BedDouble, LogOut } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n"

export function AdmittedPatients() {
  const patients = usePatients()
  const beds = useBeds()
  const { t } = useTranslation()
  const admitted = patients.filter(p => p.status === "admitted")

  function getBedNumber(bedId: string | null): string {
    if (!bedId) return "N/A"
    const bed = beds.find(b => b.id === bedId)
    return bed?.number ?? "N/A"
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BedDouble className="h-4 w-4 text-primary" />
            {t("ap.title")}
          </CardTitle>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {t("common.patients", { count: admitted.length })}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[520px]">
          <div className="flex flex-col gap-2">
            {admitted.map((patient) => (
              <div
                key={patient.id}
                className="rounded-lg border border-border/40 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{patient.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Token #{patient.tokenNumber} - Age {patient.age}</p>
                  </div>
                  <PriorityBadge priority={patient.verifiedPriority} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BedDouble className="h-3 w-3" />
                      {t("common.bed", { id: getBedNumber(patient.bedId) })}
                    </span>
                    <span className="capitalize">{patient.wardType}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      dischargePatient(patient.id)
                      toast.success(t("ap.dischargeToast", { name: patient.name }))
                    }}
                  >
                    <LogOut className="mr-1 h-3 w-3" />
                    {t("ap.discharge")}
                  </Button>
                </div>
                <div className="mt-2 rounded-md bg-muted/40 p-2">
                  <p className="text-xs text-muted-foreground">{patient.symptoms}</p>
                </div>
              </div>
            ))}
            {admitted.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <BedDouble className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="font-medium">{t("ap.empty")}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
