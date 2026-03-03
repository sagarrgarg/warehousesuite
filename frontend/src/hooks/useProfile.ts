import { useFrappeGetCall } from 'frappe-react-sdk'
import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { useEffect } from 'react'
import type { POWProfile, ProfileOperations, ProfileWarehouses } from '@/types'

const selectedProfileAtom = atomWithStorage<string | null>('pow-selected-profile', null)
const defaultWarehouseAtom = atomWithStorage<string | null>('pow-default-warehouse', null)

export function useProfiles() {
	const { data, error, isLoading } = useFrappeGetCall<{ message: POWProfile[] }>(
		'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_applicable_pow_profiles'
	)

	const profiles = data?.message ?? []

	return { profiles, error, isLoading }
}

export function useSelectedProfile() {
	const [selectedProfileName, setSelectedProfileName] = useAtom(selectedProfileAtom)
	const [defaultWarehouse, setDefaultWarehouse] = useAtom(defaultWarehouseAtom)
	const { profiles, isLoading } = useProfiles()

	useEffect(() => {
		if (!isLoading && profiles.length > 0) {
			if (profiles.length === 1) {
				setSelectedProfileName(profiles[0].name)
			} else if (selectedProfileName && !profiles.find(p => p.name === selectedProfileName)) {
				setSelectedProfileName(profiles[0].name)
			}
		}
	}, [profiles, isLoading, selectedProfileName, setSelectedProfileName])

	const selectedProfile = profiles.find(p => p.name === selectedProfileName) ?? null

	return {
		selectedProfile,
		selectedProfileName,
		setSelectedProfileName,
		defaultWarehouse,
		setDefaultWarehouse,
		profiles,
		isLoading,
	}
}

export function useProfileOperations(profileName: string | null) {
	const { data } = useFrappeGetCall<{ message: ProfileOperations }>(
		profileName
			? 'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_pow_profile_operations'
			: null,
		profileName ? { pow_profile: profileName } : undefined
	)

	return data?.message ?? null
}

export function useProfileWarehouses(profileName: string | null) {
	const { data } = useFrappeGetCall<{ message: ProfileWarehouses }>(
		profileName
			? 'warehousesuite.warehousesuite.page.pow_dashboard.pow_dashboard.get_pow_profile_warehouses'
			: null,
		profileName ? { pow_profile: profileName } : undefined
	)

	return data?.message ?? null
}
