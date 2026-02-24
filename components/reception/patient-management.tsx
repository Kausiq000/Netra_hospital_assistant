"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { PriorityBadge } from "@/components/priority-badge"
import { usePatients, useBeds } from "@/hooks/use-hospital"
import { updatePriority, admitPatient, dischargePatient } from "@/lib/hospital-store"
import type { Priority } from "@/lib/types"
import { Users, Search, BedDouble, LogOut, ArrowUpDown } from "lucide-react"
import { toast } from "sonner"

export function PatientManagement() {
  const patients = usePatients()
  const beds = useBeds()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [admitDialogOpen, setAdmitDialogOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)
  const [selectedBed, setSelectedBed] = useState<string>("")

  const availableBeds = beds.filter(b => b.status === "available")
  const filtered = patients.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !String(p.tokenNumber).includes(search)) return false
    return true
  })

  async function handleAdmit() {
    if (selectedPatient && selectedBed) {
      await admitPatient(selectedPatient, selectedBed)
      toast.success("Patient admitted successfully")
      setAdmitDialogOpen(false)
      setSelectedPatient(null)
      setSelectedBed("")
    }
  }

  async function handleDischarge(patientId: string) {
    await dischargePatient(patientId)
    toast.success("Patient discharged successfully")
  }

  async function handlePriorityChange(patientId: string, newPriority: Priority) {
    await updatePriority(patientId, newPriority)
    toast.success("Priority updated")
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Patient Management
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or token..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs w-48"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patients</SelectItem>
                <SelectItem value="in-queue">In Queue</SelectItem>
                <SelectItem value="admitted">Admitted</SelectItem>
                <SelectItem value="discharged">Discharged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">
                  <span className="flex items-center gap-1">Token <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Age</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="hidden lg:table-cell">Ward</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-mono text-sm font-semibold">#{patient.tokenNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{patient.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-40">{patient.symptoms}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{patient.age}</TableCell>
                  <TableCell>
                    {patient.status !== "discharged" ? (
                      <Select
                        value={patient.verifiedPriority}
                        onValueChange={(v) => handlePriorityChange(patient.id, v as Priority)}
                      >
                        <SelectTrigger className="h-7 w-28 border-0 p-0">
                          <PriorityBadge priority={patient.verifiedPriority} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mild">Mild</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="severe">Severe</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <PriorityBadge priority={patient.verifiedPriority} />
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs font-medium capitalize text-muted-foreground">{patient.wardType}</span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                      {patient.status === "in-queue" ? "In Queue" : patient.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {patient.status === "in-queue" && availableBeds.length > 0 && (
                        <Dialog open={admitDialogOpen && selectedPatient === patient.id} onOpenChange={(open) => {
                          setAdmitDialogOpen(open)
                          if (open) setSelectedPatient(patient.id)
                          else { setSelectedPatient(null); setSelectedBed("") }
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              <BedDouble className="mr-1 h-3 w-3" />
                              Admit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Admit Patient</DialogTitle>
                              <DialogDescription>
                                Assign a bed to {patient.name} (Token #{patient.tokenNumber})
                              </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col gap-4 pt-4">
                              <Select value={selectedBed} onValueChange={setSelectedBed}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an available bed" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableBeds.map(bed => (
                                    <SelectItem key={bed.id} value={bed.id}>
                                      {bed.number} ({bed.type.toUpperCase()} - Floor {bed.floor})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button onClick={handleAdmit} disabled={!selectedBed}>
                                Confirm Admission
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      {patient.status === "admitted" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleDischarge(patient.id)}
                        >
                          <LogOut className="mr-1 h-3 w-3" />
                          Discharge
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No patients found matching your criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
