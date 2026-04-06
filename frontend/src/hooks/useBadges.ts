import { useFrappeGetCall } from 'frappe-react-sdk'
import { API } from '@/lib/api'

const REFRESH_INTERVAL = 30_000

export function useReceiveBadge(powProfileName: string | null) {
	const { data, mutate } = useFrappeGetCall<{ message: any[] }>(
		API.getTransferReceiveData,
		powProfileName ? { pow_profile: powProfileName } : undefined,
		powProfileName ? undefined : null,
		{ refreshInterval: REFRESH_INTERVAL },
	)
	return { count: data?.message?.length ?? 0, refresh: mutate }
}

export function useSentBadge(powProfileName: string | null) {
	const { data, mutate } = useFrappeGetCall<{ message: any[] }>(
		API.getPendingSentTransfers,
		powProfileName ? { pow_profile: powProfileName } : undefined,
		powProfileName ? undefined : null,
		{ refreshInterval: REFRESH_INTERVAL },
	)
	return { count: data?.message?.length ?? 0, refresh: mutate }
}
