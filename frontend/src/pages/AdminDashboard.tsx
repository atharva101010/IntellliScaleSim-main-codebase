import { motion } from 'framer-motion'
import { ArrowRight, Activity, Receipt, Settings, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const reveal = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function AdminDashboard() {
  return (
    <motion.div className="space-y-6" initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
      <motion.div variants={reveal}>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Admin Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">Operational control center for platform health, policy, and governance.</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <motion.div variants={reveal}>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>System Health</CardDescription>
              <CardTitle className="flex items-center justify-between text-2xl">
                Stable
                <ShieldCheck className="h-5 w-5 text-slate-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">No critical incidents in the current window.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={reveal}>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Monitoring</CardDescription>
              <CardTitle className="flex items-center justify-between text-2xl">
                Live
                <Activity className="h-5 w-5 text-slate-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Telemetry pipeline and dashboards are active.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={reveal}>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Billing Audits</CardDescription>
              <CardTitle className="flex items-center justify-between text-2xl">
                Ready
                <Receipt className="h-5 w-5 text-slate-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Cost reporting and alerts are configured.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={reveal}>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Platform Policy</CardDescription>
              <CardTitle className="flex items-center justify-between text-2xl">
                Enforced
                <Settings className="h-5 w-5 text-slate-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Scaling and deployment controls are in effect.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={reveal}>
        <Card>
          <CardHeader>
            <CardTitle>Administrative Actions</CardTitle>
            <CardDescription>Jump directly to high-impact operational workflows.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link to="/admin/monitoring">
              <Button variant="outline">
                Open Monitoring
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/admin/autoscaling">
              <Button variant="outline">
                Manage Auto-Scaling
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/admin/billing">
              <Button variant="outline">
                Review Billing
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
