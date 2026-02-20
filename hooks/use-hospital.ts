"use client"

import { useSyncExternalStore, useCallback } from "react"
import {
  subscribe,
  getPatients,
  getBeds,
  getStats,
  getQueue,
  getLogs,
  getPatientById,
  getPatientByToken,
} from "@/lib/hospital-store"

export function usePatients() {
  return useSyncExternalStore(subscribe, getPatients, getPatients)
}

export function useBeds() {
  return useSyncExternalStore(subscribe, getBeds, getBeds)
}

export function useStats() {
  return useSyncExternalStore(subscribe, getStats, getStats)
}

export function useQueue() {
  return useSyncExternalStore(subscribe, getQueue, getQueue)
}

export function useLogs() {
  return useSyncExternalStore(subscribe, getLogs, getLogs)
}

export function usePatientById(id: string) {
  const getSnap = useCallback(() => getPatientById(id), [id])
  return useSyncExternalStore(subscribe, getSnap, getSnap)
}

export function usePatientByToken(token: number) {
  const getSnap = useCallback(() => getPatientByToken(token), [token])
  return useSyncExternalStore(subscribe, getSnap, getSnap)
}
