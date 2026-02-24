"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { submitAppointmentRequest } from "@/lib/appointment-store"
import { CalendarClock, Stethoscope, Clock, CheckCircle2, User, Lock, Info } from "lucide-react"
import { toast } from "sonner"
import { useTranslation } from "@/lib/i18n"

interface Props {
  /** When provided the name field is locked (returning patient). Otherwise the patient types it. */
  patientName?: string
}

interface Doctor {
  id: string
  name: string
  specialty: string
  status: string
}

const TIME_SLOTS = [
  "9:00 AM – 10:00 AM",
  "10:00 AM – 11:00 AM",
  "11:00 AM – 12:00 PM",
  "2:00 PM – 3:00 PM",
  "3:00 PM – 4:00 PM",
  "4:00 PM – 5:00 PM",
]

export function DoctorAppointmentRequest({ patientName }: Props) {
  const { t } = useTranslation()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [name, setName] = useState(patientName ?? "")
  const [selectedDoctor, setSelectedDoctor] = useState("")
  const [selectedSlot, setSelectedSlot] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [nameError, setNameError] = useState("")
  const channelRef = useRef<string>(`doc-avail-patient-${Date.now()}`)

  useEffect(() => {
    const load = () =>
      supabase
        .from("doctors")
        .select("*")
        .eq("status", "available")
        .order("name")
        .then(({ data }) => { if (data) setDoctors(data) })

    load()

    const channel = supabase
      .channel(channelRef.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "doctors" }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const doctor = doctors.find(d => d.id === selectedDoctor)

  async function handleSubmit() {
    if (!patientName && !name.trim()) {
      setNameError(t("doctorAppt.nameError"))
      return
    }
    if (!selectedDoctor || !selectedSlot) {
      toast.error(t("doctorAppt.selectError"))
      return
    }

    setSubmitting(true)
    try {
      await submitAppointmentRequest({
        patientName: (patientName ?? name).trim(),
        doctorId: doctor!.id,
        doctorName: doctor!.name,
        specialty: doctor!.specialty,
        slot: selectedSlot,
      })
      setSubmitted(true)
      toast.success(t("doctorAppt.successToast"))
    } catch {
      toast.error(t("doctorAppt.failToast"))
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Success state ── */
  if (submitted) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="py-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 mb-3" />
          <h3 className="font-bold text-emerald-800 text-lg">{t("doctorAppt.successTitle")}</h3>
          <p className="text-sm text-emerald-600 mt-1">
            {t("doctorAppt.successMsg", { doctor: doctor?.name ?? "", slot: selectedSlot })}
          </p>
          <p className="text-xs text-emerald-500 mt-3">
            {t("doctorAppt.successHint")}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
            onClick={() => {
              setSubmitted(false)
              setSelectedDoctor("")
              setSelectedSlot("")
            }}
          >
            {t("doctorAppt.requestAnother")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  /* ── Form ── */
  return (
    <Card className="w-full border-sky-200 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-sky-100 p-2">
            <CalendarClock className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <CardTitle className="text-lg text-sky-800">{t("doctorAppt.title")}</CardTitle>
            <CardDescription>
              {t("doctorAppt.desc")}
            </CardDescription>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs text-amber-700 flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              {t("doctorAppt.info")}
            </span>
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* ── Name field ── */}
        {patientName ? (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              <User className="h-3 w-3" />
              {t("common.patientName")}
              <Lock className="h-2.5 w-2.5 text-slate-400" />
            </div>
            <Badge variant="outline" className="text-sm font-medium text-slate-700 border-slate-300 bg-white px-3 py-1">
              {patientName}
            </Badge>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="appt-name" className="flex items-center gap-1.5 text-sm font-medium">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              {t("doctorAppt.yourName")}
            </Label>
            <Input
              id="appt-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError("") }}
              placeholder={t("doctorAppt.namePlaceholder")}
              className={nameError ? "border-red-300" : "border-sky-200"}
            />
            {nameError && <p className="text-xs text-red-600">{nameError}</p>}
          </div>
        )}

        {/* ── Doctor Selection ── */}
        <div className="flex flex-col gap-2">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
            {t("doctorAppt.selectDoctor")}
          </Label>
          {doctors.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-400 text-center">
                {t("doctorAppt.noDoctors")}
              </p>
            </div>
          ) : (
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger className="border-sky-200 focus:border-sky-400">
                <SelectValue placeholder={t("doctorAppt.choosePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {doctors.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} — {d.specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {doctor && (
            <Badge className="w-fit bg-sky-50 text-sky-700 border-sky-200 text-xs">
              {doctor.specialty}
            </Badge>
          )}
        </div>

        {/* ── Time Slot ── */}
        <div className="flex flex-col gap-2">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {t("doctorAppt.timeSlot")}
          </Label>
          <Select value={selectedSlot} onValueChange={setSelectedSlot}>
            <SelectTrigger className="border-sky-200 focus:border-sky-400">
              <SelectValue placeholder={t("doctorAppt.timePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {TIME_SLOTS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!selectedDoctor || !selectedSlot || submitting || (!patientName && !name.trim())}
          className="mt-1 w-full bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-700 hover:to-cyan-600 text-white border-0"
        >
          {submitting ? t("doctorAppt.submitting") : t("doctorAppt.submit")}
        </Button>
      </CardContent>
    </Card>
  )
}
