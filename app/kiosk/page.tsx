"use client"

import { useState, useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"
import Image from "next/image"

export default function KioskPage() {
  const [url, setUrl] = useState("")
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    // Dynamically resolve the landing page URL so patients land on the home page
    setUrl(window.location.origin)
    const tick = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-10"
      style={{
        background: "linear-gradient(135deg, #0f0a2e 0%, #1a0a3c 40%, #0a1a2e 100%)",
      }}
    >
      {/* Hospital brand */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <Image
            src="/Netralogo.png"
            alt="NETRA Logo"
            width={52}
            height={52}
            className="h-13 w-13 object-contain"
            priority
          />
          <span
            className="text-5xl font-black tracking-tight"
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
        </div>
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-300">
          Smart Hospital Capacity Management
        </p>
      </div>

      {/* QR Card */}
      <div className="flex flex-col items-center rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
        {/* QR code */}
        {url && (
          <div className="rounded-2xl bg-white p-5 shadow-lg">
            <QRCodeSVG
              value={url}
              size={260}
              bgColor="#ffffff"
              fgColor="#1e1040"
              level="H"
              imageSettings={{
                src: "/Netralogo.png",
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 flex flex-col items-center gap-1 text-center">
          <p className="text-2xl font-bold text-white">Scan to Access NETRA</p>
          <p className="mt-1 text-sm text-violet-300">
            Point your phone camera at the QR code to open the hospital portal
          </p>
        </div>

        {/* Steps */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          {[
            { step: "1", label: "Scan QR", sub: "with your phone camera" },
            { step: "2", label: "Register", sub: "enter your details" },
            { step: "3", label: "Get Token", sub: "track your queue live" },
          ].map((s) => (
            <div key={s.step} className="flex flex-col items-center gap-1.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #6c47ff, #a78bfa)" }}
              >
                {s.step}
              </div>
              <p className="text-sm font-semibold text-white">{s.label}</p>
              <p className="text-xs text-violet-400">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* URL hint */}
      <p className="mt-6 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-mono text-xs text-violet-300">
        {url || "Loading…"}
      </p>

      {/* Live clock */}
      <p className="mt-4 text-xs text-violet-500">
        {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </p>
    </div>
  )
}
