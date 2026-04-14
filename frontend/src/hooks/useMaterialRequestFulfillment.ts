import { useState, useCallback } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { API, unwrap, formatPowFetchError } from '@/lib/api'
import type { FulfillmentLineOption, MaterialRequestFulfillmentPayload } from '@/types'

export function useFulfillmentOptions(mrName: string | null, profileWarehouses: string[] | null) {
  const { data, isLoading, error, mutate } = useFrappeGetCall<{
    message: FulfillmentLineOption[]
  }>(
    API.getMRFulfillmentOptions,
    mrName
      ? {
          mr_name: mrName,
          profile_warehouses: profileWarehouses?.length
            ? JSON.stringify(profileWarehouses)
            : undefined,
        }
      : undefined,
    mrName ? undefined : null,
  )

  return {
    options: data?.message ?? [],
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useCreateTransferFromMR(onSuccess?: () => void) {
  const { call } = useFrappePostCall(API.createTransferFromMR)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const createTransfer = useCallback(
    async (params: {
      mr_name: string
      source_warehouse: string
      in_transit_warehouse: string
      target_warehouse: string
      items: MaterialRequestFulfillmentPayload[]
      company: string
      remarks?: string
      pow_profile?: string
      allow_insufficient_stock?: number
    }) => {
      setIsSubmitting(true)
      setSubmitError(null)
      try {
        const res = await call({
          mr_name: params.mr_name,
          source_warehouse: params.source_warehouse,
          in_transit_warehouse: params.in_transit_warehouse,
          target_warehouse: params.target_warehouse,
          items: JSON.stringify(params.items),
          company: params.company,
          remarks: params.remarks || '',
          pow_profile: params.pow_profile,
          allow_insufficient_stock: params.allow_insufficient_stock ?? 0,
        })
        const result = unwrap(res)
        if (result?.status === 'success') {
          onSuccess?.()
        }
        return result
      } catch (err: unknown) {
        setSubmitError(formatPowFetchError(err, 'Transfer failed. Please try again.'))
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [call, onSuccess],
  )

  const clearError = useCallback(() => setSubmitError(null), [])

  return { createTransfer, isSubmitting, submitError, clearError }
}
