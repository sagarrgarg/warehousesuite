import { useFrappeGetCall } from 'frappe-react-sdk'
import { API } from '@/lib/api'
import type { TransferReceiveGroup } from '@/types'

const REFRESH_INTERVAL = 30_000

export function usePendingPowReceives(warehouses: string[]) {
  const hasWarehouses = warehouses.length > 0
  const { data, mutate, isLoading, error } = useFrappeGetCall<{
    message: TransferReceiveGroup[]
  }>(
    API.getTransferReceiveData,
    hasWarehouses ? { warehouses: JSON.stringify(warehouses) } : undefined,
    hasWarehouses ? undefined : null,
    { refreshInterval: REFRESH_INTERVAL },
  )

  return {
    receives: data?.message ?? [],
    refresh: mutate,
    isLoading,
    error,
  }
}
