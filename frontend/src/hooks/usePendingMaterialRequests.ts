import { useFrappeGetCall } from 'frappe-react-sdk'
import { API } from '@/lib/api'
import type { PendingMaterialRequest } from '@/types'

const REFRESH_INTERVAL = 30_000

export function usePendingMaterialRequests(powProfileName: string | null) {
  const params = powProfileName
    ? { pow_profile: powProfileName }
    : undefined

  const { data, mutate, isLoading, error } = useFrappeGetCall<{
    message: PendingMaterialRequest[]
  }>(
    API.getPendingTransferMRs,
    params,
    powProfileName ? undefined : null,
    { refreshInterval: REFRESH_INTERVAL },
  )

  return {
    requests: data?.message ?? [],
    refresh: mutate,
    isLoading,
    error,
  }
}
