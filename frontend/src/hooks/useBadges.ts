import { useFrappeGetCall } from 'frappe-react-sdk'
import { API } from '@/lib/api'

const REFRESH_INTERVAL = 30_000

export function useReceiveBadge(defaultWarehouse: string | null) {
	const { data, mutate } = useFrappeGetCall<{ message: any[] }>(
		API.getTransferReceiveData,
		defaultWarehouse ? { default_warehouse: defaultWarehouse } : undefined,
		defaultWarehouse ? undefined : null,
		{ refreshInterval: REFRESH_INTERVAL },
	)
	return { count: data?.message?.length ?? 0, refresh: mutate }
}

export function useSentBadge(sourceWarehouse: string | null) {
	const { data, mutate } = useFrappeGetCall<{ message: any[] }>(
		API.getPendingSentTransfers,
		sourceWarehouse ? { source_warehouse: sourceWarehouse } : undefined,
		sourceWarehouse ? undefined : null,
		{ refreshInterval: REFRESH_INTERVAL },
	)
	return { count: data?.message?.length ?? 0, refresh: mutate }
}
