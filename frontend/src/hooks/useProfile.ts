import { useFrappeGetCall } from 'frappe-react-sdk'
import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { useEffect } from 'react'
import { API } from '@/lib/api'
import type { POWProfile, ProfileOperations, ProfileWarehouses } from '@/types'

const selectedProfileAtom = atomWithStorage<string | null>('pow-selected-profile', null)
const defaultWarehouseAtom = atomWithStorage<string | null>('pow-default-warehouse', null)

export function useProfiles() {
	const { data, error, isLoading } = useFrappeGetCall<{ message: POWProfile[] }>(API.getProfiles)
	return { profiles: data?.message ?? [], error, isLoading }
}

export function useSelectedProfile() {
	const [selectedProfileName, setSelectedProfileName] = useAtom(selectedProfileAtom)
	const [defaultWarehouse, setDefaultWarehouse] = useAtom(defaultWarehouseAtom)
	const { profiles, isLoading, error: profilesError } = useProfiles()

	useEffect(() => {
		if (isLoading || profiles.length === 0) return
		if (profiles.length === 1) {
			setSelectedProfileName(profiles[0].name)
		} else if (selectedProfileName && !profiles.find(p => p.name === selectedProfileName)) {
			setSelectedProfileName(profiles[0].name)
		}
	}, [profiles, isLoading, selectedProfileName, setSelectedProfileName])

	return {
		selectedProfile: profiles.find(p => p.name === selectedProfileName) ?? null,
		selectedProfileName,
		setSelectedProfileName,
		defaultWarehouse,
		setDefaultWarehouse,
		profiles,
		isLoading,
		profilesError,
	}
}

export function useProfileOperations(profileName: string | null): ProfileOperations | null {
	const { data } = useFrappeGetCall<{ message: ProfileOperations }>(
		API.getProfileOperations,
		profileName ? { pow_profile: profileName } : undefined,
		profileName ? undefined : null,
	)
	return profileName ? (data?.message ?? null) : null
}

export function useProfileWarehouses(profileName: string | null): ProfileWarehouses | null {
	const { data } = useFrappeGetCall<{ message: ProfileWarehouses }>(
		API.getProfileWarehouses,
		profileName ? { pow_profile: profileName } : undefined,
		profileName ? undefined : null,
	)
	return profileName ? (data?.message ?? null) : null
}
