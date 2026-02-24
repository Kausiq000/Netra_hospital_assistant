"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  Shield,
  Activity,
  Users,
  BedDouble,
  BarChart3,
  Zap,
  ChevronDown,
  Plus,
  Hexagon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n"

/* ---------- floating shape specs ---------- */
const SHAPES = [
  { type: "circle",   size: 90,  top: "8%",  left: "4%",  delay: "0s",   dur: "7s",  opacity: 0.18 },
  { type: "ring",     size: 140, top: "12%", left: "80%", delay: "1s",   dur: "9s",  opacity: 0.14 },
  { type: "cross",    size: 50,  top: "30%", left: "90%", delay: "0.5s", dur: "6s",  opacity: 0.22 },
  { type: "hex",      size: 80,  top: "55%", left: "5%",  delay: "2s",   dur: "8s",  opacity: 0.16 },
  { type: "circle",   size: 50,  top: "72%", left: "88%", delay: "1.5s", dur: "7s",  opacity: 0.12 },
  { type: "ring",     size: 60,  top: "80%", left: "20%", delay: "0.8s", dur: "10s", opacity: 0.18 },
  { type: "cross",    size: 36,  top: "22%", left: "55%", delay: "3s",   dur: "5s",  opacity: 0.20 },
  { type: "hex",      size: 110, top: "60%", left: "65%", delay: "2.5s", dur: "11s", opacity: 0.10 },
  { type: "circle",   size: 30,  top: "45%", left: "72%", delay: "1.2s", dur: "6s",  opacity: 0.25 },
  { type: "ring",     size: 44,  top: "15%", left: "38%", delay: "4s",   dur: "8s",  opacity: 0.14 },
]

function FloatingShapes() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {SHAPES.map((s, i) => (
        <div
          key={i}
          className="absolute animate-float"
          style={{ top: s.top, left: s.left, animationDelay: s.delay, animationDuration: s.dur, opacity: s.opacity }}
        >
          {s.type === "circle" && (
            <div className="rounded-full bg-gradient-to-br from-violet-400 to-emerald-300" style={{ width: s.size, height: s.size }} />
          )}
          {s.type === "ring" && (
            <div className="rounded-full border-4 border-violet-400/60" style={{ width: s.size, height: s.size }} />
          )}
          {s.type === "cross" && (
            <Plus style={{ width: s.size, height: s.size }} className="text-emerald-400 stroke-[1.5]" />
          )}
          {s.type === "hex" && (
            <Hexagon style={{ width: s.size, height: s.size }} className="text-violet-400 stroke-[1]" />
          )}
        </div>
      ))}
      {Array.from({ length: 28 }).map((_, i) => (
        <div
          key={`dot-${i}`}
          className="absolute rounded-full animate-particle"
          style={{
            width: 4 + (i % 3) * 3, height: 4 + (i % 3) * 3,
            top: `${(i * 3.7 + 5) % 90}%`, left: `${(i * 5.3 + 3) % 95}%`,
            background: i % 2 === 0 ? "#6c47ff" : "#00c896",
            animationDelay: `${(i * 0.4) % 5}s`, animationDuration: `${5 + (i % 4)}s`,
            opacity: 0.22,
          }}
        />
      ))}
    </div>
  )
}

/* ---------- fade-in-on-scroll hook ---------- */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.12 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, visible }
}

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal()
  return (
    <div ref={ref} className={cn("transition-all duration-700 ease-out", visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8", className)}>
      {children}
    </div>
  )
}

/* ==================================================================== */

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0)
  const [now, setNow] = useState<Date | null>(null)
  const { t, lang, setLang } = useTranslation()

  useEffect(() => {
    setNow(new Date())
    const tick = setInterval(() => setNow(new Date()), 1000)
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      clearInterval(tick)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#0d1117", color: "#1a2640" }}>

      {/* ====== FIXED NAVBAR ====== */}
      <header className={cn("fixed top-0 z-50 w-full transition-all duration-300", scrollY > 60 ? "bg-white/90 shadow-sm backdrop-blur-lg border-b border-violet-100" : "bg-transparent")}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/Netralogo.png"
              alt="NETRA"
              width={36}
              height={36}
              className="h-9 w-9 object-contain shrink-0"
              priority
            />
            <span
              className={cn(
                "text-xl font-bold tracking-widest uppercase",
                scrollY > 60
                  ? "bg-gradient-to-r from-violet-700 to-emerald-500 bg-clip-text text-transparent"
                  : "text-white"
              )}
              style={{ fontFamily: "var(--font-rajdhani), sans-serif" }}
            >
              NETRA
            </span>
          </Link>
          <nav className={cn("hidden md:flex items-center gap-8 text-sm font-medium", scrollY > 60 ? "text-slate-500" : "text-white/70")}>
            <a href="#who-we-are" className="hover:text-violet-400 transition-colors">{t("landing.whoWeAre")}</a>
            <a href="#our-mission" className="hover:text-violet-400 transition-colors">{t("landing.ourMission")}</a>
            <a href="#how-we-work" className="hover:text-violet-400 transition-colors">{t("landing.howWeWork")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "en" ? "ta" : "en")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors border",
                scrollY > 60
                  ? "border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
                  : "border-white/30 bg-white/10 text-white hover:bg-white/20"
              )}
            >
              {lang === "en" ? "தமிழ்" : "English"}
            </button>
            <Link href="/login">
              <Button size="sm" className="rounded-full px-5 text-white shadow-md transition-all" style={{ background: "linear-gradient(135deg, #6c47ff, #00c896)" }}>
                {t("landing.signIn")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ====== HERO ====== */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">

        {/* ── Video background ── */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "brightness(0.30) saturate(0.6)" }}
        >
          <source src="/hero-hospital.mp4" type="video/mp4" />
        </video>

        {/* ── Subtle gradient vignette over video ── */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

        {/* ── Content ── */}
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">

          {/* Giant NETRA wordmark — Rajdhani font with site gradient */}
          <h1
            className="animate-fade-in-up leading-none tracking-[0.06em] uppercase"
            style={{
              fontFamily: "var(--font-rajdhani), sans-serif",
              fontWeight: 700,
              fontSize: "clamp(5.5rem, 20vw, 15rem)",
              background: "linear-gradient(135deg, #6c47ff 0%, #00c896 55%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            NETRA
          </h1>

          {/* Buttons — stacked vertically, both centered */}
          <div className="mt-12 flex flex-col items-center gap-4 animate-fade-in-up-delay-3">
            <Link href="/patient?mode=register">
              <Button
                size="lg"
                className="w-64 rounded-full text-base font-bold text-white shadow-lg hover:scale-105 transition-all"
                style={{ background: "linear-gradient(135deg, #6c47ff, #00c896)" }}
              >
                {t("landing.register")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="w-64 rounded-full border-white/30 bg-white/10 text-base font-semibold text-white hover:bg-white/20 hover:border-white/50 backdrop-blur transition-all"
              >
                {t("landing.signIn")}
              </Button>
            </Link>
          </div>

          {/* Live Clock */}
          <div className="mt-14 flex flex-col items-center gap-1 animate-fade-in-up-delay-3">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-black/30 px-8 py-4 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span
                className="font-mono text-2xl font-bold tabular-nums text-white tracking-widest"
                suppressHydrationWarning
              >
                {now
                  ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
                  : "--:--:--"}
              </span>
              <span className="text-xs font-medium text-white/50 hidden sm:block">
                {now ? now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : ""}
              </span>
            </div>
          </div>
        </div>

        <a href="#who-we-are" className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40 animate-bounce">
          <span className="text-xs font-medium">{t("landing.explore")}</span>
          <ChevronDown className="h-5 w-5" />
        </a>
      </section>

      {/* ====== WHO WE ARE ====== */}
      <section id="who-we-are" className="py-24 lg:py-32" style={{ background: "#F4FFF8" }}>
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Section>
            <div className="text-center">
              <span className="inline-block rounded-full bg-violet-100 px-4 py-1 text-xs font-bold uppercase tracking-wider text-violet-700">{t("landing.whoWeAre")}</span>
              <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl" style={{ color: "#1a2640" }}>
                {t("landing.heroTagline")}
                <span className="bg-gradient-to-r from-violet-600 to-emerald-500 bg-clip-text text-transparent">{t("landing.heroTaglineHighlight")}</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-slate-500 leading-relaxed">
                {t("landing.heroDesc")}
              </p>
            </div>
          </Section>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              { icon: Shield,   titleKey: "landing.feat1Title", descKey: "landing.feat1Desc", gradient: "from-violet-500 to-violet-400" },
              { icon: Activity, titleKey: "landing.feat2Title", descKey: "landing.feat2Desc", gradient: "from-emerald-500 to-teal-400" },
              { icon: BarChart3,titleKey: "landing.feat3Title", descKey: "landing.feat3Desc", gradient: "from-violet-500 to-emerald-400" },
            ].map((card, i) => (
              <Section key={i}>
                <div className="group rounded-2xl border border-violet-100 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:border-violet-200 hover:-translate-y-1">
                  <div className={cn("mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl text-white transition-transform group-hover:scale-110 bg-gradient-to-br", card.gradient)}>
                    <card.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{t(card.titleKey)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{t(card.descKey)}</p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ====== OUR MISSION ====== */}
      <section id="our-mission" className="py-24 lg:py-32" style={{ background: "#FAF5FF" }}>
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Section>
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="inline-block rounded-full bg-violet-100 px-4 py-1 text-xs font-bold uppercase tracking-wider text-violet-700">{t("landing.ourMission")}</span>
                <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl leading-tight" style={{ color: "#1a2640" }}>
                  {t("landing.missionTag")}<br />
                  <span className="bg-gradient-to-r from-violet-600 to-emerald-500 bg-clip-text text-transparent">{t("landing.missionHighlight")}</span>
                </h2>
                <p className="mt-4 text-base text-slate-500 leading-relaxed">
                  {t("landing.missionDesc")}
                </p>
                <ul className="mt-6 space-y-3">
                  {["landing.missionBullet1", "landing.missionBullet2", "landing.missionBullet3", "landing.missionBullet4"].map((key, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      {t(key)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-5">
                {[
                  { value: "38",     labelKey: "landing.statBeds",  icon: BedDouble,  color: "from-violet-500 to-violet-400" },
                  { value: "4",      labelKey: "landing.statRoles", icon: Users,      color: "from-emerald-500 to-teal-400"  },
                  { value: "< 8min", labelKey: "landing.statWait",  icon: Zap,        color: "from-amber-500 to-orange-400"  },
                  { value: "100%",   labelKey: "landing.statSync",  icon: Activity,   color: "from-violet-500 to-emerald-400" },
                ].map((stat, i) => (
                  <Section key={i}>
                    <div className="rounded-2xl border border-violet-100 bg-white p-6 text-center shadow-sm">
                      <div className={cn("mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white", stat.color)}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                      <p className="text-2xl font-extrabold" style={{ color: "#1a2640" }}>{stat.value}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{t(stat.labelKey)}</p>
                    </div>
                  </Section>
                ))}
              </div>
            </div>
          </Section>
        </div>
      </section>
      
{/* Lobby Video Section */}
<section className="w-full py-16 bg-white">
  <div className="max-w-6xl mx-auto px-4">
    <div className="rounded-2xl overflow-hidden shadow-xl">
      <video
        src="/Lobby.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-auto object-cover"
      />
    </div>
  </div>
</section>

      {/* ====== HOW WE WORK ====== */}
      <section id="how-we-work" className="py-24 lg:py-32" style={{ background: "#F4FFF8" }}>
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <Section>
            <div className="text-center">
              <span className="inline-block rounded-full bg-emerald-100 px-4 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">{t("landing.howWeWork")}</span>
              <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl" style={{ color: "#1a2640" }}>
                {t("landing.howTag")}
                <span className="bg-gradient-to-r from-violet-600 to-emerald-500 bg-clip-text text-transparent">{t("landing.howTagHighlight")}</span>
              </h2>
            </div>
          </Section>
          <div className="relative mt-16">
            <div className="absolute left-0 right-0 top-[60px] hidden h-0.5 bg-gradient-to-r from-violet-200 via-emerald-400 to-violet-200 lg:block" />
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
              {[
                { step: "01", titleKey: "landing.step1Title", descKey: "landing.step1Desc", icon: Users },
                { step: "02", titleKey: "landing.step2Title", descKey: "landing.step2Desc", icon: Activity },
                { step: "03", titleKey: "landing.step3Title", descKey: "landing.step3Desc", icon: BedDouble },
                { step: "04", titleKey: "landing.step4Title", descKey: "landing.step4Desc", icon: BarChart3 },
              ].map((item, i) => (
                <Section key={i}>
                  <div className="relative flex flex-col items-center text-center">
                    <div className="relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: "linear-gradient(135deg, #6c47ff, #00c896)" }}>
                      <item.icon className="h-7 w-7" />
                    </div>
                    <span className="mt-3 text-xs font-bold uppercase tracking-widest text-violet-400">Step {item.step}</span>
                    <h3 className="mt-2 text-lg font-bold text-slate-800">{t(item.titleKey)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{t(item.descKey)}</p>
                  </div>
                </Section>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====== CTA BAND ====== */}
      <section className="py-20" style={{ background: "linear-gradient(135deg, #6c47ff 0%, #00c896 100%)" }}>
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Section>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">{t("landing.ctaTitle")}</h2>
            <p className="mt-3 text-base text-white/80">{t("landing.ctaDesc")}</p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/patient">
                <Button size="lg" className="rounded-full bg-white px-10 text-base font-bold text-violet-700 shadow-lg hover:bg-violet-50 transition-all hover:scale-105">
                  {t("landing.ctaRegister")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="rounded-full border-white/50 bg-transparent px-10 text-base font-semibold text-white hover:bg-white/10 transition-all">
                  {t("landing.ctaStaff")}
                </Button>
              </Link>
            </div>
          </Section>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="border-t border-violet-100 py-10" style={{ background: "#FAF5FF" }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 text-center lg:flex-row lg:justify-between lg:text-left">
          <div className="flex items-center gap-2">
            <Image
              src="/Netralogo.png"
              alt="NETRA"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
            <span className="text-lg font-extrabold bg-gradient-to-r from-violet-700 to-emerald-500 bg-clip-text text-transparent">NETRA</span>
          </div>
          <p className="text-sm text-slate-400">{t("landing.footer", { year: new Date().getFullYear().toString() })}</p>
          <div className="flex gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-violet-600 transition-colors">{t("landing.privacy")}</a>
            <a href="#" className="hover:text-violet-600 transition-colors">{t("landing.terms")}</a>
            <a href="#" className="hover:text-violet-600 transition-colors">{t("landing.contact")}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
