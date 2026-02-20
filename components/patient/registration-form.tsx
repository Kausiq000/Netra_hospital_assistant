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
import { ClipboardList, User, Calendar, FileText, AlertCircle, Building2 } from "lucide-react"

interface RegistrationFormProps {
  onRegistered: (patientId: string, tokenNumber: number) => void
}

export function RegistrationForm({ onRegistered }: RegistrationFormProps) {
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [symptoms, setSymptoms] = useState("")
  const [severity, setSeverity] = useState<Priority>("mild")
  const [wardType, setWardType] = useState<WardType>("general")
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = "Name is required"
    if (!age || Number(age) < 1 || Number(age) > 120) newErrors.age = "Valid age required"
    if (!symptoms.trim()) newErrors.symptoms = "Please describe your symptoms"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const patient = registerPatient({
      name: name.trim(),
      age: Number(age),
      symptoms: symptoms.trim(),
      selfAssessedSeverity: severity,
      wardType,
    })
    onRegistered(patient.id, patient.tokenNumber)
  }

  return (
    <Card className="w-full max-w-lg border-border/60">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Patient Registration</CardTitle>
            <CardDescription>Enter your details to generate a digital token</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="flex items-center gap-1.5 text-sm font-medium">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Full Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: "" })) }}
              placeholder="Enter your full name"
              className={errors.name ? "border-red-300" : ""}
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="age" className="flex items-center gap-1.5 text-sm font-medium">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Age
            </Label>
            <Input
              id="age"
              type="number"
              min={1}
              max={120}
              value={age}
              onChange={(e) => { setAge(e.target.value); setErrors(prev => ({ ...prev, age: "" })) }}
              placeholder="Enter your age"
              className={errors.age ? "border-red-300" : ""}
            />
            {errors.age && <p className="text-xs text-red-600">{errors.age}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="symptoms" className="flex items-center gap-1.5 text-sm font-medium">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Symptoms
            </Label>
            <Textarea
              id="symptoms"
              value={symptoms}
              onChange={(e) => { setSymptoms(e.target.value); setErrors(prev => ({ ...prev, symptoms: "" })) }}
              placeholder="Describe your symptoms..."
              rows={3}
              className={errors.symptoms ? "border-red-300" : ""}
            />
            {errors.symptoms && <p className="text-xs text-red-600">{errors.symptoms}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Self-Assessed Severity
            </Label>
            <RadioGroup value={severity} onValueChange={(v) => setSeverity(v as Priority)} className="grid grid-cols-2 gap-2">
              {(["mild", "moderate", "severe", "critical"] as Priority[]).map((p) => (
                <Label
                  key={p}
                  htmlFor={`severity-${p}`}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem value={p} id={`severity-${p}`} />
                  <span className="text-sm font-medium capitalize">{p}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              Ward Type
            </Label>
            <Select value={wardType} onValueChange={(v) => setWardType(v as WardType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Ward</SelectItem>
                <SelectItem value="emergency">Emergency Ward</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="mt-2 w-full">
            Generate Token
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
