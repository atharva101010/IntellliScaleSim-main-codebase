import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Boxes, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const cardAnimation = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function TeacherDashboard() {
  return (
    <motion.div className="space-y-6" initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
      <motion.div variants={cardAnimation}>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Teacher Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">Manage classes, assignments, and simulation outcomes from a unified workspace.</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <motion.div variants={cardAnimation}>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Classes</CardDescription>
              <CardTitle className="flex items-center justify-between text-2xl">
                6
                <Users className="h-5 w-5 text-slate-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Courses currently assigned to your account.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardAnimation}>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Lab Deployments</CardDescription>
              <CardTitle className="flex items-center justify-between text-2xl">
                18
                <Boxes className="h-5 w-5 text-slate-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Total student workloads deployed this week.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardAnimation}>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Guide Coverage</CardDescription>
              <CardTitle className="flex items-center justify-between text-2xl">
                92%
                <BookOpen className="h-5 w-5 text-slate-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Students with completed deployment onboarding.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={cardAnimation}>
        <Card>
          <CardHeader>
            <CardTitle>Quick Navigation</CardTitle>
            <CardDescription>Open key areas for mentoring and classroom operations.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link to="/teacher/deployments">
              <Button variant="outline">
                Deployments
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/teacher/monitoring">
              <Button variant="outline">
                Monitoring
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/teacher/guides">
              <Button variant="outline">
                Deployment Guides
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
