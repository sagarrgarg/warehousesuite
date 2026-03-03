import type { POWProfile } from '@/types'

interface ProfileSwitcherProps {
	profiles: POWProfile[]
	selectedProfileName: string | null
	onSelect: (name: string) => void
}

export default function ProfileSwitcher({ profiles, selectedProfileName, onSelect }: ProfileSwitcherProps) {
	return (
		<select
			className="bg-white/20 text-white text-sm rounded-lg px-3 py-1.5 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
			value={selectedProfileName ?? ''}
			onChange={(e) => onSelect(e.target.value)}
		>
			{profiles.map(profile => (
				<option key={profile.name} value={profile.name} className="text-gray-900">
					{profile.name1}
				</option>
			))}
		</select>
	)
}
