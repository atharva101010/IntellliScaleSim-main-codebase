import { NavLink } from 'react-router-dom'
import type { ComponentType } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowUpDown,
  BookOpen,
  Boxes,
  Gauge,
  LayoutDashboard,
  Receipt,
  Settings,
  ServerCog,
  UserCircle2,
  Users,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '@/lib/utils'

type NavItem = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
}

function Item({ to, label, icon: Icon }: NavItem) {
  return (
    <NavLink
      to={to}
      className="block"
      end
    >
      {({ isActive }) => (
        <motion.div
          whileTap={{ scale: 0.98 }}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          )}
        >
          <Icon className={cn('h-4 w-4', isActive ? 'text-white' : 'text-slate-500')} />
          <span>{label}</span>
        </motion.div>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user } = useAuth()
  const role = user?.role || 'student'

  const studentItems: NavItem[] = [
    { to: '/student', label: 'Overview', icon: LayoutDashboard },
    { to: '/student/classes', label: 'Classes', icon: Users },
    { to: '/student/deployments', label: 'Deployments', icon: Boxes },
    { to: '/student/monitoring', label: 'Monitoring', icon: Activity },
    { to: '/student/autoscaling', label: 'Auto-Scaling', icon: ArrowUpDown },
    { to: '/student/loadtest', label: 'Load Testing', icon: Gauge },
    { to: '/student/billing', label: 'Billing', icon: Receipt },
    { to: '/student/guides', label: 'Deployment Guides', icon: BookOpen },
    { to: '/student/profile', label: 'Profile', icon: UserCircle2 },
  ]

  const teacherItems: NavItem[] = [
    { to: '/teacher', label: 'Overview', icon: LayoutDashboard },
    { to: '/teacher/deployments', label: 'Deployments', icon: Boxes },
    { to: '/teacher/monitoring', label: 'Monitoring', icon: Activity },
    { to: '/teacher/billing', label: 'Billing', icon: Receipt },
    { to: '/teacher/guides', label: 'Deployment Guides', icon: BookOpen },
    { to: '/teacher/classes', label: 'Classes', icon: Users },
    { to: '/teacher/profile', label: 'Profile', icon: UserCircle2 },
  ]

  const adminItems: NavItem[] = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/deployments', label: 'Deployments', icon: Boxes },
    { to: '/admin/monitoring', label: 'Monitoring', icon: Activity },
    { to: '/admin/autoscaling', label: 'Auto-Scaling', icon: ArrowUpDown },
    { to: '/admin/loadtest', label: 'Load Testing', icon: Gauge },
    { to: '/admin/billing', label: 'Billing', icon: Receipt },
    { to: '/admin/guides', label: 'Deployment Guides', icon: BookOpen },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/systems', label: 'Systems', icon: ServerCog },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
    { to: '/admin/profile', label: 'Profile', icon: UserCircle2 },
  ]

  const navItems = role === 'teacher' ? teacherItems : role === 'admin' ? adminItems : studentItems

  return (
    <aside className="hidden h-[calc(100vh-56px)] w-72 overflow-y-auto border-r border-slate-200 bg-white p-6 lg:block sticky top-14">
      <div className="mb-8">
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
            IS
          </div>
          <div className="overflow-hidden text-ellipsis">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Workspace</div>
            <div className="truncate text-sm font-semibold capitalize text-slate-900">{role} Portal</div>
          </div>
        </div>
      </div>

      <div className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Navigation</div>
      <nav className="space-y-1.5">
        {navItems.map((item) => (
          <Item key={item.to} {...item} />
        ))}
      </nav>
    </aside>
  )
}
