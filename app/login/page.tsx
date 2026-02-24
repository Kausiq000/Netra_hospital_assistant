"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Eye, EyeOff, Lock, User, ArrowRight, Loader2,
  UserCircle, Stethoscope, ShieldCheck, HeartPulse,
} from "lucide-react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { loginWithCredentials } from "@/lib/auth-store"
import { useTranslation } from "@/lib/i18n"

type Domain = "patient" | "nurse" | "doctor" | "admin"

const DOMAINS: {
  key: Domain
  label: string
  labelKey: string
  icon: React.ReactNode
  activeBg: string
  hintKey: string
}[] = [
  {
    key: "patient",
    label: "Patient",
    labelKey: "login.tabPatient",
    icon: null,
    activeBg: "linear-gradient(135deg,#00c896,#00a073)",
    hintKey: "login.patientHint",
  },
  {
    key: "nurse",
    label: "Nurse",
    labelKey: "login.tabNurse",
    icon: null,
    activeBg: "linear-gradient(135deg,#7c3aed,#6c47ff)",
    hintKey: "login.staffHint",
  },
  {
    key: "doctor",
    label: "Doctor",
    labelKey: "login.tabDoctor",
    icon: null,
    activeBg: "linear-gradient(135deg,#0284c7,#0ea5e9)",
    hintKey: "login.staffHint",
  },
  {
    key: "admin",
    label: "Admin",
    labelKey: "login.tabAdmin",
    icon: null,
    activeBg: "linear-gradient(135deg,#d97706,#f59e0b)",
    hintKey: "login.adminHint",
  },
]

function getRolePath(role: string): string {
  switch (role) {
    case "patient": return "/patient"
    case "nurse":   return "/nurse"
    case "doctor":  return "/doctor"
    case "admin":   return "/reception"
    default:        return "/"
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { t } = useTranslation()

  const [domain, setDomain]     = useState<Domain>("patient")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)

  const active = DOMAINS.find((d) => d.key === domain)!

  function switchDomain(d: Domain) {
    setDomain(d)
    setUsername("")
    setPassword("")
    setError("")
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) { setError(t("login.usernameError")); return }
    if (!password)         { setError(t("login.passwordError")); return }
    setError("")
    setLoading(true)
    try {
      const user = await loginWithCredentials(username.trim(), password)
      if (!user) {
        setError(t("login.invalidCreds"))
        setLoading(false)
        return
      }
      const expectedRole = domain === "admin" ? "admin" : domain
      if (user.role !== expectedRole) {
        setError(t("login.wrongPortal", { role: user.role, domain }))
        setLoading(false)
        return
      }
      router.push(getRolePath(user.role))
    } catch {
      setError(t("login.failed"))
      setLoading(false)
    }
  }

  const domainIcons: Record<Domain, React.ReactNode> = {
    patient: <UserCircle className="h-5 w-5" />,
    nurse:   <HeartPulse className="h-5 w-5" />,
    doctor:  <Stethoscope className="h-5 w-5" />,
    admin:   <ShieldCheck className="h-5 w-5" />,
  }

  return (
    <div className="medical-bg flex min-h-screen flex-col items-center justify-center px-4 py-10">
      {/* Logo */}
      <Link href="/" className="mb-8 flex flex-col items-center gap-2">
        <Image
          src="/Netralogo.png"
          alt="NETRA Logo"
          width={64}
          height={64}
          className="h-16 w-16 object-contain drop-shadow-lg"
          priority
        />
        <span
          className="text-3xl font-extrabold tracking-tight"
          style={{
            fontFamily: "var(--font-rajdhani), 'Rajdhani', sans-serif",
            background: "linear-gradient(135deg, #6c47ff 0%, #00c896 55%, #a78bfa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          NETRA
        </span>
        <p className="text-sm text-slate-500">{t("login.tagline")}</p>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white/95 shadow-xl backdrop-blur-sm overflow-hidden">

        {/* Domain tabs */}
        <div className="grid grid-cols-4 border-b border-slate-100">
          {DOMAINS.map((d) => {
            const isActive = d.key === domain
            return (
              <button
                key={d.key}
                onClick={() => switchDomain(d.key)}
                className={`flex flex-col items-center gap-1.5 py-4 text-xs font-semibold transition-all
                  ${isActive ? "text-white" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
                style={isActive ? { background: d.activeBg } : {}}
              >
                {domainIcons[d.key]}
                {t(d.labelKey)}
              </button>
            )
          })}
        </div>

        {/* Form body */}
        <div className="p-8">
          <h1 className="mb-1 text-xl font-bold text-slate-800">
            {t("login.signInAs", { label: t(active.labelKey) })}
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            {t("login.accessPortal", { label: t(active.labelKey).toLowerCase() })}
          </p>

          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username" className="text-sm font-medium text-slate-700">{t("login.username")}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder={domain === "patient" ? t("login.patientUserPlaceholder") : t("login.staffUserPlaceholder")}
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError("") }}
                  className="pl-10"
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">{t("login.password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  placeholder={t("login.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError("") }}
                  className="pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Credential hint */}
            <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              {t(active.hintKey)}
            </p>

            {error && (
              <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="mt-1 w-full font-semibold text-white shadow-md"
              style={{ background: active.activeBg }}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("login.submitBtn", { label: t(active.labelKey) })}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>

      {domain === "patient" && (
        <p className="mt-6 text-center text-xs text-slate-400">
          {t("login.newPatientPrompt")}{" "}
          <Link href="/patient" className="font-medium text-violet-600 hover:underline">
            {t("login.registerHere")}
          </Link>
        </p>
      )}
    </div>
  )
}