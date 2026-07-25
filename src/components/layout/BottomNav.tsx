import { NavLink } from 'react-router-dom'
import { CalendarDays, ClipboardList, LineChart, Bell } from 'lucide-react'
import { focusRing } from '../../lib/styles'

const tabs = [
  { to: '/', label: 'Today', Icon: CalendarDays },
  { to: '/history', label: 'History', Icon: ClipboardList },
  { to: '/charts', label: 'Charts', Icon: LineChart },
  { to: '/reminders', label: 'Reminders', Icon: Bell },
]

export function BottomNav() {
  return (
    <nav aria-label="Primary" className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line flex pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2.5 gap-1 font-mono text-[10px] uppercase tracking-[0.08em] ${focusRing} ${
              isActive ? 'text-signal' : 'text-faint'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className="w-5 h-5" strokeWidth={1.5} />
              {label}
              <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-signal glow-signal' : 'bg-transparent'}`} />
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
