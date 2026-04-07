import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Boxes, Check, Clock, Users, TrendingUp, BarChart3, AlertCircle, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const cardAnimation = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

const stepAnimation = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
}

export default function TeacherDashboard() {
  const teachingWorkflow = [
    {
      step: 1,
      title: 'Create Class',
      description: 'Set up new course sections and invite students to join your classes.',
      icon: Users,
      cta: 'Go to Classes',
      link: '/teacher/classes',
    },
    {
      step: 2,
      title: 'Deploy Labs',
      description: 'Launch pre-built or custom lab environments for hands-on learning.',
      icon: Boxes,
      cta: 'Deploy Now',
      link: '/teacher/deployments',
    },
    {
      step: 3,
      title: 'Monitor Progress',
      description: 'Track student performance metrics and resource utilization in real-time.',
      icon: BarChart3,
      cta: 'View Monitoring',
      link: '/teacher/monitoring',
    },
    {
      step: 4,
      title: 'Review & Assess',
      description: 'Analyze results, provide feedback, and guide students on improvements.',
      icon: TrendingUp,
      cta: 'Review Results',
      link: '/teacher/deployments',
    },
  ]

  const performanceMetrics = [
    { label: 'Class Engagement', value: '94%', sublabel: '↑ 5% from last week', trend: 'up' },
    { label: 'Deployment Health', value: '100%', sublabel: 'All labs operational', trend: 'neutral' },
    { label: 'Student Success', value: '87%', sublabel: 'Completed objectives', trend: 'up' },
  ]

  const labManagementChecklist = [
    { task: 'Deploy lab for Advanced Networks class', status: 'completed' },
    { task: 'Review student deployment configurations', status: 'in-progress' },
    { task: 'Set up monitoring alerts for load testing', status: 'pending' },
    { task: 'Prepare deployment guide for new cohort', status: 'pending' },
  ]

  return (
    <motion.div className="space-y-8" initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
      {/* Hero Section */}
      <motion.div variants={cardAnimation} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100 p-8">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">Teacher Dashboard</h1>
          <p className="text-lg text-slate-600 mb-4">
            Manage classes, design lab experiences, and guide students through real-world infrastructure scenarios.
          </p>
          <p className="text-sm text-slate-500">
            IntelliScaleSim empowers educators to teach cloud infrastructure, auto-scaling, and cost optimization through interactive, hands-on labs.
          </p>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <motion.div variants={cardAnimation}>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Classes</CardDescription>
              <CardTitle className="flex items-center justify-between text-2xl">
                6
                <Users className="h-5 w-5 text-blue-500" />
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
                <Boxes className="h-5 w-5 text-green-500" />
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
                <BookOpen className="h-5 w-5 text-purple-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Students with completed deployment onboarding.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Overview */}
      <motion.div variants={cardAnimation}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Performance Overview
            </CardTitle>
            <CardDescription>Real-time metrics on class engagement and lab health.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {performanceMetrics.map((metric) => (
                <div key={metric.label} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <p className="text-sm text-slate-600 font-medium">{metric.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{metric.value}</p>
                  <p className={`text-xs mt-2 ${metric.trend === 'up' ? 'text-green-600' : 'text-slate-500'}`}>
                    {metric.sublabel}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Teaching Workflow */}
      <motion.div variants={cardAnimation}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Teaching Workflow
            </CardTitle>
            <CardDescription>Your step-by-step guide to managing labs and student outcomes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {teachingWorkflow.map((item) => {
                const IconComponent = item.icon
                return (
                  <motion.div key={item.step} variants={stepAnimation} className="relative">
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 hover:bg-slate-100 transition-colors h-full flex flex-col">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white text-sm font-semibold">
                          {item.step}
                        </div>
                        <IconComponent className="h-5 w-5 text-slate-600" />
                      </div>
                      <h3 className="font-semibold text-slate-900 text-sm mb-2">{item.title}</h3>
                      <p className="text-xs text-slate-600 mb-4 flex-1">{item.description}</p>
                      <Link to={item.link} className="mt-auto">
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          {item.cta}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Lab Management Checklist */}
      <motion.div variants={cardAnimation}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Lab Management Tasks
            </CardTitle>
            <CardDescription>Upcoming tasks to keep your labs running smoothly.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {labManagementChecklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 pb-3 border-b border-slate-200 last:border-b-0 last:pb-0">
                  <div className="mt-1">
                    {item.status === 'completed' && (
                      <Check className="h-5 w-5 text-green-500 bg-green-50 rounded-full p-0.5" />
                    )}
                    {item.status === 'in-progress' && (
                      <Clock className="h-5 w-5 text-yellow-500 bg-yellow-50 rounded-full p-0.5" />
                    )}
                    {item.status === 'pending' && (
                      <AlertCircle className="h-5 w-5 text-slate-400 bg-slate-100 rounded-full p-0.5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${item.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                      {item.task}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {item.status === 'completed' && 'Completed'}
                      {item.status === 'in-progress' && 'In Progress'}
                      {item.status === 'pending' && 'Pending'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={cardAnimation}>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Jump to frequently used sections.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link to="/teacher/classes">
              <Button variant="outline">
                Manage Classes
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/teacher/deployments">
              <Button variant="outline">
                Deploy Lab
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/teacher/monitoring">
              <Button variant="outline">
                Monitor Labs
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/teacher/guides">
              <Button variant="outline">
                View Guides
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
