import { useFrappeGetCall } from 'frappe-react-sdk'
import { API } from '@/lib/api'
import type { PendingWorkOrder } from '@/types'

const REFRESH_INTERVAL = 30_000

export function usePendingWorkOrders(powProfileName: string | null) {
  const params = powProfileName
    ? { pow_profile: powProfileName }
    : undefined

  const { data, mutate, isLoading, error } = useFrappeGetCall<{
    message: PendingWorkOrder[]
  }>(
    API.getPendingWorkOrders,
    params,
    powProfileName ? undefined : null,
    { refreshInterval: REFRESH_INTERVAL },
  )

  return {
    workOrders: data?.message ?? [],
    refresh: mutate,
    isLoading,
    error,
  }
}
