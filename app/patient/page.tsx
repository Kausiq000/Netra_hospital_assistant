"use client"

import { useState } from "react"
import { AppHeader } from "@/components/app-header"
import { RegistrationForm } from "@/components/patient/registration-form"
import { PatientStatus } from "@/components/patient/patient-status"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QrCode, Search, UserPlus } from "lucide-react"

export default function PatientPage() {
  const [view, setView] = useState<"home" | "status">("home")
  const [tokenNumber, setTokenNumber] = useState<number>(0)
  const [lookupToken, setLookupToken] = useState("")

  function handleRegistered(_patientId: string, token: number) {
    setTokenNumber(token)
    setView("status")
  }

  function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    const num = Number(lookupToken)
    if (num > 0) {
      setTokenNumber(num)
      setView("status")
    }
  }

  if (view === "status" && tokenNumber > 0) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto flex max-w-screen-2xl justify-center px-4 py-8 lg:px-8">
          <PatientStatus tokenNumber={tokenNumber} onBack={() => setView("home")} />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto flex max-w-screen-2xl flex-col items-center px-4 py-8 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Patient Portal</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Register for a consultation or check your queue status</p>
        </div>

        <Tabs defaultValue="register" className="w-full max-w-lg">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="register" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Register
            </TabsTrigger>
            <TabsTrigger value="lookup" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Check Status
            </TabsTrigger>
          </TabsList>

          <TabsContent value="register" className="mt-6">
            <RegistrationForm onRegistered={handleRegistered} />
          </TabsContent>

          <TabsContent value="lookup" className="mt-6">
            <Card className="border-border/60">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <QrCode className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Check Queue Status</CardTitle>
                    <CardDescription>Enter your token number to view your queue position</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLookup} className="flex flex-col gap-4">
                  <Input
                    type="number"
                    placeholder="Enter your token number (e.g., 101)"
                    value={lookupToken}
                    onChange={(e) => setLookupToken(e.target.value)}
                  />
                  <Button type="submit" className="w-full">
                    <Search className="mr-2 h-4 w-4" />
                    Look Up Token
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
