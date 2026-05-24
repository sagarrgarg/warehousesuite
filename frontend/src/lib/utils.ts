import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * UUID for client-side React keys. ``crypto.randomUUID`` is only available
 * in secure contexts (HTTPS, localhost); on plain HTTP it throws. Falls back
 * to a timestamp + random string, which is unique enough for in-memory row
 * IDs (we are not generating identifiers that need to be globally unique).
 */
export function safeUuid(): string {
	const c = globalThis.crypto as Crypto | undefined
	if (c && typeof c.randomUUID === "function") {
		try { return c.randomUUID() } catch { /* fall through */ }
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`
}
