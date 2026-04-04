import { useFrappeGetCall } from 'frappe-react-sdk'
import { API } from '@/lib/api'
import type { PendingMaterialRequest } from '@/types'

const REFRESH_INTERVAL = 30_000

export function usePendingMaterialRequests(warehouses: string[] | null) {
  const params = warehouses?.length
    ? { warehouses: JSON.stringify(warehouses) }
    : undefined

  const { data, mutate, isLoading, error } = useFrappeGetCall<{
    message: PendingMaterialRequest[]
  }>(
    API.getPendingTransferMRs,
    params,
    undefined,
    { refreshInterval: REFRESH_INTERVAL },
  )

  return {
    requests: data?.message ?? [],
    refresh: mutate,
    isLoading,
    error,
  }
}
