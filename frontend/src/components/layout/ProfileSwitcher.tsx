import { ChevronDown } from 'lucide-react'
import type { POWProfile } from '@/types'

interface ProfileSwitcherProps {
	profiles: POWProfile[]
	selectedProfileName: string | null
	onSelect: (name: string) => void
}

export default function ProfileSwitcher({ profiles, selectedProfileName, onSelect }: ProfileSwitcherProps) {
	if (profiles.length <= 1) return null

	return (
		<div className="relative max-w-[min(46vw,11.5rem)] sm:max-w-[13.5rem] min-w-0">
			<ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 dark:text-slate-400 pointer-events-none" />
			<select
				className="appearance-none w-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium rounded pl-2 pr-6 py-1 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer touch-manipulation truncate"
				value={selectedProfileName ?? ''}
				onChange={(e) => onSelect(e.target.value)}
			>
				{profiles.map(profile => (
					<option key={profile.name} value={profile.name} className="text-gray-900 bg-white">
						{profile.name1 ?? profile.name}
					</option>
				))}
			</select>
		</div>
	)
}
