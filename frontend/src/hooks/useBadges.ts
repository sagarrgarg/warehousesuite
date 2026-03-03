import { useFrappeGetCall } from 'frappe-react-sdk'
import { API } from '@/lib/api'

/** Fetch pending receive count (how many transfers are waiting at this warehouse) */
export function useReceiveBadge(defaultWarehouse: string | null) {
	const { data, mutate } = useFrappeGetCall<{ message: any[] }>(
		API.getTransferReceiveData,
		defaultWarehouse ? { default_warehouse: defaultWarehouse } : undefined,
		defaultWarehouse ? undefined : null,
	)
	const count = data?.message?.length ?? 0
	return { count, refresh: mutate }
}

/** Fetch pending sent count (how many transfers were sent from this warehouse and not yet received) */
export function useSentBadge(sourceWarehouse: string | null) {
	const { data, mutate } = useFrappeGetCall<{ message: any[] }>(
		API.getPendingSentTransfers,
		sourceWarehouse ? { source_warehouse: sourceWarehouse } : undefined,
		sourceWarehouse ? undefined : null,
	)
	const count = data?.message?.length ?? 0
	return { count, refresh: mutate }
}
