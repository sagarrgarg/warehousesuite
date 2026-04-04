import { useFrappeGetCall } from 'frappe-react-sdk'
import { API } from '@/lib/api'

const REFRESH_INTERVAL = 30_000

export function useReceiveBadge(warehouses: string[]) {
	const hasWarehouses = warehouses.length > 0
	const { data, mutate } = useFrappeGetCall<{ message: any[] }>(
		API.getTransferReceiveData,
		hasWarehouses ? { warehouses: JSON.stringify(warehouses) } : undefined,
		hasWarehouses ? undefined : null,
		{ refreshInterval: REFRESH_INTERVAL },
	)
	return { count: data?.message?.length ?? 0, refresh: mutate }
}

export function useSentBadge(warehouses: string[]) {
	const hasWarehouses = warehouses.length > 0
	const { data, mutate } = useFrappeGetCall<{ message: any[] }>(
		API.getPendingSentTransfers,
		hasWarehouses ? { warehouses: JSON.stringify(warehouses) } : undefined,
		hasWarehouses ? undefined : null,
		{ refreshInterval: REFRESH_INTERVAL },
	)
	return { count: data?.message?.length ?? 0, refresh: mutate }
}
