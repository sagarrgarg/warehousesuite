import { atom } from 'jotai'

export type PrinterDevice = string | { name: string; [key: string]: unknown }

// Global state for QZ Tray connection to avoid reconnecting on every modal open
export const qzConnectedAtom = atom<boolean>(false)
export const qzPrintersAtom = atom<PrinterDevice[]>([])
export const qzLoadingAtom = atom<boolean>(false)
export const qzErrorAtom = atom<string | null>(null)
