import { useFrappeGetCall } from 'frappe-react-sdk'
import { API } from '@/lib/api'
import type { PendingWorkOrder } from '@/types'

const REFRESH_INTERVAL = 30_000

export function usePendingWorkOrders(warehouses: string[] | null) {
  const params = warehouses?.length
    ? { warehouses: JSON.stringify(warehouses) }
    : undefined

  const { data, mutate, isLoading, error } = useFrappeGetCall<{
    message: PendingWorkOrder[]
  }>(
    API.getPendingWorkOrders,
    params,
    undefined,
    { refreshInterval: REFRESH_INTERVAL },
  )

  return {
    workOrders: data?.message ?? [],
    refresh: mutate,
    isLoading,
    error,
  }
}
