import { ChevronDown } from 'lucide-react'
import type { POWProfile } from '@/types'

interface ProfileSwitcherProps {
	profiles: POWProfile[]
	selectedProfileName: string | null
	onSelect: (name: string) => void
}

export default function ProfileSwitcher({ profiles, selectedProfileName, onSelect }: ProfileSwitcherProps) {
	return (
		<div className="relative">
			<ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
			<select
				className="appearance-none bg-white/15 backdrop-blur-sm text-white text-sm font-medium rounded-xl pl-3 pr-8 py-2 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
				value={selectedProfileName ?? ''}
				onChange={(e) => onSelect(e.target.value)}
			>
				{profiles.map(profile => (
					<option key={profile.name} value={profile.name} className="text-gray-900">
						{profile.name1}
					</option>
				))}
			</select>
		</div>
	)
}
