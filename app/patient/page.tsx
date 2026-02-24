"use client"

// ─── PATIENT PAGE ─────────────────────────────────────────────────────────
// FLOW A  — ?mode=register  (landing "Register" button)
//            → Full form: name + age + symptoms + severity + ward
//            → This is for NEW patients, no account yet
//
// FLOW B  — Signed-in patient (landing "Sign In" → /login → redirect here)
//            → "Welcome back" + SmartAppointmentForm (symptoms + severity only)
//            → Visit history at bottom (at least 1 record guaranteed)
//            → If active visit found → jump straight to queue status
//
// FLOW C  — Not signed in, no ?mode → prompt to register or sign in
// ──────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppHeader } from "@/components/app-header"
import { RegistrationForm } from "@/components/patient/registration-form"
import { SmartAppointmentForm } from "@/components/patient/smart-appointment-form"
import { DoctorAppointmentRequest } from "@/components/patient/doctor-appointment-request"
import { PatientStatus } from "@/components/patient/patient-status"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  SendHorizonal, MessageCircle, X, History, Clock,
  CheckCircle2, BedDouble, UserPlus, LogIn, CalendarClock, Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { useTranslation } from "@/lib/i18n"

/* ─────────────────── types ─────────────────── */
interface PatientRecord {
  id: string
  name: string
  age: number
  symptoms: string
  status: string
  token_number: number
  self_assessed_severity: string
  verified_priority: string | null
  ward_type: string
  created_at: string
  bed_id: string | null
}

/* ─────────────────── helpers ─────────────────── */
function statusColor(s: string) {
  if (s === "in-queue")   return "bg-violet-100 text-violet-700 border-violet-300"
  if (s === "admitted")   return "bg-emerald-100 text-emerald-700 border-emerald-300"
  if (s === "discharged") return "bg-slate-100 text-slate-600 border-slate-300"
  return "bg-gray-100 text-gray-600"
}
function severityColor(s: string) {
  if (s === "critical") return "bg-red-100 text-red-700"
  if (s === "severe")   return "bg-orange-100 text-orange-700"
  if (s === "moderate") return "bg-yellow-100 text-yellow-700"
  return "bg-green-100 text-green-700"
}

/* ─────────────────── ChatBot ─────────────────── */
interface ChatMsg { sender: "user" | "bot"; text: string }

function ChatBot({
  onAction,
  tokenNumber,
}: {
  onAction: () => void
  tokenNumber: number
}) {
  const { t } = useTranslation()
  const [open, setOpen]     = useState(false)
  const [input, setInput]   = useState("")
  const [messages, setMessages] = useState<ChatMsg[]>([
    { sender: "bot", text: "__greeting__" },
  ])

  function send(text: string) {
    if (!text.trim()) return
    const lower = text.toLowerCase()
    let reply = t("chatbot.fallback")
    if (lower.includes("register") || lower.includes("new") || lower.includes("appointment") || lower.includes("book")) {
      onAction()
      reply = t("chatbot.openingAppt")
    } else if (lower.includes("queue") || lower.includes("token") || lower.includes("status")) {
      if (tokenNumber > 0) { reply = t("chatbot.tokenInfo", { token: tokenNumber }) }
      else reply = t("chatbot.noToken")
    }
    setMessages(prev => [...prev, { sender: "user", text }, { sender: "bot", text: reply }])
    setInput("")
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl"
        style={{ background: "linear-gradient(135deg,#6c47ff,#00c896)" }}
      >
        {open ? <X className="h-6 w-6 text-white" /> : <MessageCircle className="h-6 w-6 text-white" />}
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 rounded-2xl bg-white shadow-2xl overflow-hidden">
          <div className="px-4 py-3 text-white font-bold" style={{ background: "linear-gradient(135deg,#6c47ff,#00c896)" }}>
            {t("chatbot.title")}
          </div>
          <ScrollArea className="h-60 px-4 py-3">
            {messages.map((m, i) => (
              <div key={i} className={cn("mb-2 flex", m.sender === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("rounded-xl px-3 py-2 text-xs", m.sender === "user" ? "bg-violet-600 text-white" : "bg-slate-100")}>
                  {m.text === "__greeting__" ? t("chatbot.greeting") : m.text}
                </div>
              </div>
            ))}
          </ScrollArea>
          <div className="flex border-t px-3 py-2 gap-2">
            <input
              className="flex-1 rounded-lg border px-3 py-1.5 text-xs"
              placeholder={t("chatbot.placeholder")}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send(input)}
            />
            <button onClick={() => send(input)} className="text-white px-3 rounded" style={{ background: "linear-gradient(135deg,#6c47ff,#00c896)" }}>
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/* ─────────────────── Visit History ─────────────────── */
function VisitHistory({ visits }: { visits: PatientRecord[] }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5 text-slate-500" />
          {t("patient.visitHistory")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {visits.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-400 text-center">{t("patient.noVisitsOnRecord")}</p>
        ) : (
          <div className="divide-y">
            {visits.map(v => (
              <div key={v.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold">Token #{v.token_number}</span>
                    <Badge variant="outline" className={cn("text-[11px]", statusColor(v.status))}>
                      {v.status === "in-queue" ? "In Queue" : v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                    </Badge>
                    <Badge className={cn("text-[11px]", severityColor(v.verified_priority ?? v.self_assessed_severity ?? "mild"))}>
                      {v.verified_priority ?? v.self_assessed_severity ?? "mild"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{v.symptoms}</p>
                  {v.bed_id && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                      <BedDouble className="h-3 w-3" /> Bed {v.bed_id}
                    </div>
                  )}
                </div>
                  <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs text-slate-400 justify-end">
                    <Clock className="h-3 w-3" />
                    {new Date(v.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 capitalize">{t("common.ward", { type: v.ward_type })}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
type View = "loading" | "register" | "signed-in" | "status" | "prompt"

export default function PatientPage() {
  const [view, setView]           = useState<View>("loading")
  const [tokenNumber, setToken]   = useState<number>(0)
  const [allVisits, setAllVisits] = useState<PatientRecord[]>([])
  const [urlMode, setUrlMode]     = useState<string | null | undefined>(undefined)

  // Prevent view from being overwritten once it's been decided
  const viewDecidedRef = useRef(false)

  const user   = useAuth()
  const router = useRouter()
  const { t }  = useTranslation()

  /* ── read ?mode= from URL once on mount ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setUrlMode(params.get("mode"))          // null when no ?mode, string when present
  }, [])

  /* ── role guard — skip during registration, wait for URL read ── */
  useEffect(() => {
    if (!user) return
    if (urlMode === undefined) return          // URL not yet read — don't redirect yet
    if (urlMode === "register") return         // registration is always patient flow
    if (user.role === "nurse")  { router.replace("/nurse");     return }
    if (user.role === "doctor") { router.replace("/doctor");    return }
    if (user.role === "admin")  { router.replace("/reception"); return }
  }, [user, router, urlMode])

  /* ── smart routing (runs ONCE, then locked) ── */
  useEffect(() => {
    if (urlMode === undefined) return         // still reading URL
    if (viewDecidedRef.current) return        // already decided — don't re-run

    if (urlMode === "register") {
      viewDecidedRef.current = true
      setView("register")                    // FLOW A: always full form
      return
    }

    // No ?mode — depends on auth
    if (user === null) {
      const t = setTimeout(() => {
        if (!viewDecidedRef.current) {
          viewDecidedRef.current = true
          setView("prompt")                  // FLOW C: not logged in
        }
      }, 800)
      return () => clearTimeout(t)
    }
    if (user.role !== "patient") return       // handled by role guard

    // FLOW B: signed-in patient → fetch their records ONCE
    viewDecidedRef.current = true
    supabase
      .from("patients")
      .select("*")
      .ilike("name", user.name)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const records = (data ?? []) as PatientRecord[]
        setAllVisits(records)
        const active = records.find(r => r.status === "in-queue" || r.status === "admitted")
        if (active) {
          setToken(active.token_number)
          setView("status")
        } else {
          setView("signed-in")
        }
      })
  }, [user, urlMode])

  function handleRegistered(_: string, token: number) {
    viewDecidedRef.current = true            // lock view so auth changes don't bounce
    setToken(token)
    setView("status")
  }

  const lastAge = allVisits[0]?.age ?? 0

  /* ═══ VIEW: LOADING ═══ */
  if (view === "loading") return (
    <div className="min-h-screen medical-bg">
      <AppHeader />
      <main className="flex items-center justify-center py-40">
        <div className="h-10 w-10 rounded-full border-4 border-violet-400 border-t-transparent animate-spin" />
      </main>
    </div>
  )

  /* ═══ VIEW: STATUS (active in-queue / admitted) ═══ */
  if (view === "status" && tokenNumber > 0) return (
    <div className="min-h-screen medical-bg">
      <AppHeader />
      <main className="mx-auto flex max-w-screen-2xl justify-center px-4 py-8">
        <PatientStatus
          tokenNumber={tokenNumber}
          onBack={() => setView(user?.role === "patient" ? "signed-in" : "register")}
        />
      </main>
      <ChatBot
        onAction={() => setView(user?.role === "patient" ? "signed-in" : "register")}
        tokenNumber={tokenNumber}
      />
    </div>
  )

  /* ═══ VIEW: REGISTER — Full form for NEW patients (FLOW A) ═══ */
  if (view === "register") return (
    <div className="min-h-screen medical-bg">
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-800">{t("patient.newRegistration")}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t("patient.newRegFormDesc")}&nbsp;
            <Link href="/login" className="text-violet-600 font-medium hover:underline">
              {t("patient.alreadyRegistered")}
            </Link>
          </p>
        </div>

        <Tabs defaultValue="queue" className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-white border border-slate-100 shadow-sm h-11">
            <TabsTrigger value="queue" className="gap-1.5 text-sm">
              <Users className="h-3.5 w-3.5" />
              {t("patient.joinQueue")}
            </TabsTrigger>
            <TabsTrigger value="appointment" className="gap-1.5 text-sm">
              <CalendarClock className="h-3.5 w-3.5" />
              {t("patient.bookAppointment")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="queue" className="mt-4">
            <RegistrationForm onRegistered={handleRegistered} />
          </TabsContent>
          <TabsContent value="appointment" className="mt-4">
            <DoctorAppointmentRequest />
          </TabsContent>
        </Tabs>
      </main>
      <ChatBot onAction={() => {}} tokenNumber={tokenNumber} />
    </div>
  )

  /* ═══ VIEW: SIGNED-IN PATIENT DASHBOARD (FLOW B) ═══
     Smart form (symptoms + severity only, name/age locked) + visit history */
  if (view === "signed-in" && user) return (
    <div className="min-h-screen medical-bg">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">

        {/* Welcome banner */}
        <div className="rounded-2xl px-6 py-5 text-white" style={{ background: "linear-gradient(135deg,#6c47ff,#00c896)" }}>
          <div className="flex items-center gap-2 mb-1 text-sm font-medium opacity-85">
            <CheckCircle2 className="h-4 w-4" />
            {t("patient.registeredBadge")}
          </div>
          <h1 className="text-2xl font-bold">{t("patient.welcomeBack", { name: user.name })}</h1>
          <p className="mt-1 text-sm opacity-80">
            {allVisits.length > 0
              ? t("patient.visitCount", { count: allVisits.length })
              : t("patient.noVisitsYet")}
          </p>
        </div>

        {/* Tabs: Join Queue / Book Appointment */}
        <Tabs defaultValue="queue" className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-white border border-slate-100 shadow-sm h-11">
            <TabsTrigger value="queue" className="gap-1.5 text-sm">
              <Users className="h-3.5 w-3.5" />
              {t("patient.joinQueue")}
            </TabsTrigger>
            <TabsTrigger value="appointment" className="gap-1.5 text-sm">
              <CalendarClock className="h-3.5 w-3.5" />
              {t("patient.bookAppointment")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="queue" className="mt-4">
            {lastAge > 0 ? (
              <SmartAppointmentForm name={user.name} age={lastAge} onRegistered={handleRegistered} />
            ) : (
              <SmartAppointmentForm name={user.name} age={25} onRegistered={handleRegistered} />
            )}
          </TabsContent>
          <TabsContent value="appointment" className="mt-4">
            <DoctorAppointmentRequest patientName={user.name} />
          </TabsContent>
        </Tabs>

        {/* Visit history */}
        <VisitHistory visits={allVisits} />

      </main>
      <ChatBot
        onAction={() => setView("signed-in")}
        tokenNumber={tokenNumber}
      />
    </div>
  )

  /* ═══ VIEW: PROMPT — not signed in, no ?mode (FLOW C) ═══ */
  return (
    <div className="min-h-screen medical-bg">
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-slate-800">{t("patient.portal")}</h1>
          <p className="text-sm text-slate-500 mt-2">{t("patient.howProceed")}</p>
        </div>

        <div className="flex flex-col gap-4">
          <Link href="/patient?mode=register" className="block">
            <div className="flex items-center gap-4 rounded-2xl border-2 border-violet-200 bg-violet-50 p-5 hover:bg-violet-100 transition-all cursor-pointer">
              <div className="rounded-xl bg-violet-100 p-3">
                <UserPlus className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <h2 className="font-bold text-violet-800">{t("patient.newRegister")}</h2>
                <p className="text-xs text-violet-600 mt-0.5">{t("patient.newRegisterDesc")}</p>
              </div>
            </div>
          </Link>

          <Link href="/login" className="block">
            <div className="flex items-center gap-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 hover:bg-emerald-100 transition-all cursor-pointer">
              <div className="rounded-xl bg-emerald-100 p-3">
                <LogIn className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-bold text-emerald-800">{t("patient.returning")}</h2>
                <p className="text-xs text-emerald-600 mt-0.5">{t("patient.returningDesc")}</p>
              </div>
            </div>
          </Link>
        </div>
      </main>
      <ChatBot onAction={() => {}} tokenNumber={tokenNumber} />
    </div>
  )
}

