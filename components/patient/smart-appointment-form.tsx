"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { registerPatient } from "@/lib/hospital-store"
import type { Priority, WardType } from "@/lib/types"
import { Sparkles, User, Calendar, FileText, AlertCircle, Building2, Lock } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

interface SmartAppointmentFormProps {
  /** Already-known patient name — shown as locked, not editable */
  name: string
  /** Age pulled from last visit record — shown as locked */
  age: number
  onRegistered: (patientId: string, tokenNumber: number) => void
}

export function SmartAppointmentForm({ name, age, onRegistered }: SmartAppointmentFormProps) {
  const { t } = useTranslation()
  const [symptoms, setSymptoms] = useState("")
  const [severity, setSeverity] = useState<Priority>("mild")
  const [wardType, setWardType] = useState<WardType>("general")
  const [symptomsError, setSymptomsError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!symptoms.trim()) {
      setSymptomsError(t("smartForm.symptomsError"))
      return
    }

    setSubmitting(true)
    try {
      const patient = await registerPatient({
        name: name.trim(),
        age,
        symptoms: symptoms.trim(),
        selfAssessedSeverity: severity,
        wardType,
      })
      onRegistered(patient.id, patient.tokenNumber)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="w-full border-violet-200 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-violet-100 p-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <CardTitle className="text-lg text-violet-800">{t("smartForm.title")}</CardTitle>
            <CardDescription>{t("smartForm.desc")}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Locked identity fields */}
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 border border-slate-200 p-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                <User className="h-3 w-3" />
                {t("common.fullName")}
                <Lock className="h-2.5 w-2.5 text-slate-400" />
              </div>
              <Badge variant="outline" className="text-sm font-medium text-slate-700 border-slate-300 bg-white px-3 py-1">
                {name}
              </Badge>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                <Calendar className="h-3 w-3" />
                {t("common.age")}
                <Lock className="h-2.5 w-2.5 text-slate-400" />
              </div>
              <Badge variant="outline" className="text-sm font-medium text-slate-700 border-slate-300 bg-white px-3 py-1">
                {t("smartForm.yrs", { age })}
              </Badge>
            </div>
          </div>

          {/* New symptoms — only editable field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="smart-symptoms" className="flex items-center gap-1.5 text-sm font-medium">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              {t("smartForm.symptomsLabel")}
            </Label>
            <Textarea
              id="smart-symptoms"
              value={symptoms}
              onChange={(e) => { setSymptoms(e.target.value); setSymptomsError("") }}
              placeholder={t("smartForm.symptomsPlaceholder")}
              rows={3}
              className={symptomsError ? "border-red-300" : "border-violet-200 focus-visible:ring-violet-400"}
            />
            {symptomsError && <p className="text-xs text-red-600">{symptomsError}</p>}
          </div>

          {/* Severity */}
          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
              {t("smartForm.severityLabel")}
            </Label>
            <RadioGroup value={severity} onValueChange={(v) => setSeverity(v as Priority)} className="grid grid-cols-2 gap-2">
              {(["mild", "moderate", "severe", "critical"] as Priority[]).map((p) => (
                <Label
                  key={p}
                  htmlFor={`smart-severity-${p}`}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted has-[button[data-state=checked]]:border-violet-500 has-[button[data-state=checked]]:bg-violet-50"
                >
                  <RadioGroupItem value={p} id={`smart-severity-${p}`} />
                  <span className="text-sm font-medium capitalize">{t(`common.${p}`)}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* Ward type */}
          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              {t("common.wardType")}
            </Label>
            <Select value={wardType} onValueChange={(v) => setWardType(v as WardType)}>
              <SelectTrigger className="border-violet-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">{t("common.generalWard")}</SelectItem>
                <SelectItem value="emergency">{t("common.emergencyWard")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="mt-1 w-full bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-700 hover:to-cyan-600 text-white border-0"
          >
            {submitting ? t("smartForm.submitting") : t("smartForm.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
