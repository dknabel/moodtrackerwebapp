import { NavLink } from 'react-router-dom'
import { CalendarDays, ClipboardList, LineChart } from 'lucide-react'
import { focusRing } from '../../lib/styles'

const tabs = [
  { to: '/', label: 'Today', Icon: CalendarDays },
  { to: '/history', label: 'History', Icon: ClipboardList },
  { to: '/charts', label: 'Charts', Icon: LineChart },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2.5 gap-1 text-xs font-medium ${focusRing} ${
              isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
            }`
          }
        >
          <Icon className="w-6 h-6" strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
