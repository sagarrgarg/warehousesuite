import { useFrappeGetCall } from 'frappe-react-sdk'
import { API } from '@/lib/api'
import type { TransferReceiveGroup } from '@/types'

const REFRESH_INTERVAL = 30_000

/**
 * Incoming in-transit transfers for the dashboard.
 * Server filters by POW Profile **target** warehouses (+ descendants); do not pass a raw warehouse list.
 */
export function usePendingPowReceives(powProfileName: string | null) {
  const { data, mutate, isLoading, error } = useFrappeGetCall<{
    message: TransferReceiveGroup[]
  }>(
    API.getTransferReceiveData,
    powProfileName ? { pow_profile: powProfileName } : undefined,
    powProfileName ? undefined : null,
    { refreshInterval: REFRESH_INTERVAL },
  )

  return {
    receives: data?.message ?? [],
    refresh: mutate,
    isLoading,
    error,
  }
}
