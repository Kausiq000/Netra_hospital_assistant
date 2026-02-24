"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { registerPatient } from "@/lib/hospital-store"
import type { Priority, WardType } from "@/lib/types"
import { ClipboardList, User, Calendar, FileText, AlertCircle, Building2, Globe, KeyRound, Eye, EyeOff, Copy, CheckCircle2 } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

const LANGUAGES = [
  "English", "Hindi", "Telugu", "Tamil", "Kannada", "Malayalam", "Bengali", "Marathi", "Gujarati", "Urdu",
]

interface RegistrationFormProps {
  onRegistered: (patientId: string, tokenNumber: number) => void
  defaultName?: string
}

interface Credentials {
  username: string
  password: string
}

export function RegistrationForm({ onRegistered, defaultName = "" }: RegistrationFormProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(defaultName)
  const [age, setAge] = useState("")
  const [symptoms, setSymptoms] = useState("")
  const [severity, setSeverity] = useState<Priority>("mild")
  const [wardType, setWardType] = useState<WardType>("general")
  const [language, setLanguage] = useState("English")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Post-registration credentials card
  const [creds, setCreds] = useState<Credentials | null>(null)
  const [showPwd, setShowPwd] = useState(false)
  const [copied, setCopied]   = useState(false)

  function copyCredentials() {
    if (!creds) return
    navigator.clipboard.writeText(`Username: ${creds.username}\nPassword: ${creds.password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = t("regForm.nameError")
    if (!age || Number(age) < 1 || Number(age) > 120) newErrors.age = t("regForm.ageError")
    if (!symptoms.trim()) newErrors.symptoms = t("regForm.symptomsError")

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)

    const patient = await registerPatient({
      name: name.trim(),
      age: Number(age),
      symptoms: symptoms.trim(),
      selfAssessedSeverity: severity,
      wardType,
    })

    // Create login credentials for this patient: username = name (lowercase), password = name (lowercase)
    try {
      const res = await fetch("/api/create-patient-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        const data = await res.json() as { username: string; displayPassword: string }
        setCreds({ username: data.username, password: data.displayPassword })

        // Auto sign-in as the newly created patient so the header shows the correct name
        const { loginWithCredentials } = await import("@/lib/auth-store")
        await loginWithCredentials(data.username, data.displayPassword)
      }
    } catch {
      // Non-fatal: patient is registered, just no credential card
    }

    setSubmitting(false)
    onRegistered(patient.id, patient.tokenNumber)
  }

  return (
    <>
    <Card className="w-full max-w-lg border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{t("regForm.title")}</CardTitle>
            <CardDescription>{t("regForm.desc")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="flex items-center gap-1.5 text-sm font-medium">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              {t("common.fullName")}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: "" })) }}
              placeholder={t("regForm.namePlaceholder")}
              className={errors.name ? "border-red-300" : ""}
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="age" className="flex items-center gap-1.5 text-sm font-medium">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {t("common.age")}
            </Label>
            <Input
              id="age"
              type="number"
              min={1}
              max={120}
              value={age}
              onChange={(e) => { setAge(e.target.value); setErrors(prev => ({ ...prev, age: "" })) }}
              placeholder={t("regForm.agePlaceholder")}
              className={errors.age ? "border-red-300" : ""}
            />
            {errors.age && <p className="text-xs text-red-600">{errors.age}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="symptoms" className="flex items-center gap-1.5 text-sm font-medium">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              {t("regForm.symptomsLabel")}
            </Label>
            <Textarea
              id="symptoms"
              value={symptoms}
              onChange={(e) => { setSymptoms(e.target.value); setErrors(prev => ({ ...prev, symptoms: "" })) }}
              placeholder={t("regForm.symptomsPlaceholder")}
              rows={3}
              className={errors.symptoms ? "border-red-300" : ""}
            />
            {errors.symptoms && <p className="text-xs text-red-600">{errors.symptoms}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
              {t("regForm.severityLabel")}
            </Label>
            <RadioGroup value={severity} onValueChange={(v) => setSeverity(v as Priority)} className="grid grid-cols-2 gap-2">
              {(["mild", "moderate", "severe", "critical"] as Priority[]).map((p) => (
                <Label
                  key={p}
                  htmlFor={`severity-${p}`}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value={p} id={`severity-${p}`} />
                  <span className="text-sm font-medium capitalize">{t(`common.${p}`)}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              {t("common.wardType")}
            </Label>
            <Select value={wardType} onValueChange={(v) => setWardType(v as WardType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">{t("common.generalWard")}</SelectItem>
                <SelectItem value="emergency">{t("common.emergencyWard")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              {t("regForm.languageLabel")}
            </Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="mt-2 w-full" disabled={submitting}>
            {submitting ? t("regForm.submitting") : t("regForm.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>

    {/* ── Credentials Card (shown after successful registration) ── */}
    {creds && (
      <Card className="w-full max-w-lg mt-4 border-emerald-200 bg-emerald-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2">
              <KeyRound className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base text-emerald-800">{t("regForm.credsTitle")}</CardTitle>
              <CardDescription className="text-emerald-600 text-xs">
                {t("regForm.credsDesc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white border border-emerald-100 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500 mb-1">{t("regForm.username")}</p>
              <p className="font-mono font-bold text-slate-800 text-sm">{creds.username}</p>
            </div>
            <div className="rounded-lg bg-white border border-emerald-100 px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500">{t("regForm.password")}</p>
                <button onClick={() => setShowPwd(v => !v)} className="text-emerald-400 hover:text-emerald-600">
                  {showPwd ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
              <p className="font-mono font-bold text-slate-800 text-sm">
                {showPwd ? creds.password : "•".repeat(creds.password.length)}
              </p>
            </div>
          </div>
          <button
            onClick={copyCredentials}
            className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            {copied
              ? <><CheckCircle2 className="h-3.5 w-3.5" /> {t("regForm.copied")}</>
              : <><Copy className="h-3.5 w-3.5" /> {t("regForm.copy")}</>
            }
          </button>
          <p className="text-center text-[10px] text-emerald-600">
            Login at <span className="font-semibold">/login</span> with username: <span className="font-mono font-semibold">{creds.username}</span> and password: <span className="font-mono font-semibold">{creds.username}</span>
          </p>
        </CardContent>
      </Card>
    )}
    </>
  )
}
