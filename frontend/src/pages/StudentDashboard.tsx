import type { ComponentType } from 'react'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  CheckCircle2,
  CloudCog,
  Cpu,
  Gauge,
  GitBranch,
  Rocket,
  ShieldCheck,
  Workflow,
  Loader,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { tasksApi, type TaskWithCompletion } from '@/utils/api'
import CompleteTaskModal from '@/components/StudentDashboard/CompleteTaskModal'
import TaskCard from '@/components/StudentDashboard/TaskCard'

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function StudentDashboard() {
  const [tasks, setTasks] = useState<TaskWithCompletion[]>([])
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithCompletion | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    setIsLoadingTasks(true)
    try {
      const data = await tasksApi.listStudentTasks()
      setTasks(data)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setIsLoadingTasks(false)
    }
  }

  const handleTaskCardClick = (task: TaskWithCompletion) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const handleTaskComplete = () => {
    fetchTasks()
  }

  const pendingTasks = tasks.filter(t => t.student_completion_status !== 'completed')
  const completedTasks = tasks.filter(t => t.student_completion_status === 'completed')
  return (
    <motion.div className="space-y-8" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeInUp} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Project Overview</h1>
          <p className="mt-1 text-sm text-slate-500">A guided view of IntelliScaleSim for faster onboarding and hands-on learning.</p>
        </div>
        <Badge variant="secondary" className="w-fit px-3 py-1 text-xs uppercase tracking-wider">
          Learning Platform
        </Badge>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card className="overflow-hidden border-slate-900 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white">
          <CardContent className="grid gap-6 p-6 md:grid-cols-12 md:p-8">
            <div className="md:col-span-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">IntelliScaleSim Platform</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Learn Cloud Operations Through Real Simulation</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-200">
                Deploy containerized apps, stress-test them with real traffic, observe auto-scaling behavior,
                and compare cloud pricing models in one unified environment.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Badge className="bg-white/10 text-white hover:bg-white/20">FastAPI + React</Badge>
                <Badge className="bg-white/10 text-white hover:bg-white/20">Docker-based Labs</Badge>
                <Badge className="bg-white/10 text-white hover:bg-white/20">Prometheus + Grafana</Badge>
                <Badge className="bg-white/10 text-white hover:bg-white/20">AI Cost Insights</Badge>
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="rounded-xl border border-white/20 bg-white/5 p-4">
                <h3 className="text-sm font-semibold">Start Here</h3>
                <p className="mt-1 text-xs text-slate-300">Use this sequence for your first complete lab run.</p>
                <div className="mt-3 space-y-2 text-sm">
                  <HeroStep icon={Rocket} label="Deploy app" />
                  <HeroStep icon={Gauge} label="Run load test" />
                  <HeroStep icon={GitBranch} label="Watch auto-scaling" />
                  <HeroStep icon={BarChart3} label="Compare cloud costs" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <motion.div variants={fadeInUp} className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>What Is IntelliScaleSim?</CardTitle>
                <CardDescription>
                  IntelliScaleSim is a cloud orchestration simulator that helps you deploy containers, run load tests,
                  watch scaling behavior, and compare infrastructure costs.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Core Learning Workflow</h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  <li>1. Deploy a containerized application from the Deployments section.</li>
                  <li>2. Monitor resource behavior and service health in Monitoring.</li>
                  <li>3. Trigger traffic using Load Testing to simulate real usage.</li>
                  <li>4. Review scaling response and compare pricing in Billing.</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FeatureCard
                  icon={Boxes}
                  title="Container Deployment"
                  description="Launch workloads from Docker images and manage runtime settings."
                />
                <FeatureCard
                  icon={Gauge}
                  title="Load Testing"
                  description="Generate controlled traffic to study latency and throughput."
                />
                <FeatureCard
                  icon={GitBranch}
                  title="Auto-Scaling"
                  description="Observe scale-up and scale-down behavior under changing demand."
                />
                <FeatureCard
                  icon={BarChart3}
                  title="Cost Visibility"
                  description="Estimate and compare cloud costs across AWS, GCP, and Azure."
                />
                <FeatureCard
                  icon={Workflow}
                  title="Workflow Learning"
                  description="Practice a production-like DevOps flow in a safe simulation environment."
                />
                <FeatureCard
                  icon={ShieldCheck}
                  title="Operational Awareness"
                  description="Build confidence with monitoring, reliability, and performance trade-offs."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Learning Journey</CardTitle>
              <CardDescription>Follow this path to complete your first end-to-end scenario.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <JourneyStep
                number="01"
                title="Deploy a Practice Application"
                description="Create your first running container and verify endpoint health."
                ctaLabel="Open Deployments"
                to="/student/deployments"
              />
              <JourneyStep
                number="02"
                title="Generate Controlled Traffic"
                description="Run short tests to measure latency, throughput, and behavior under load."
                ctaLabel="Open Load Testing"
                to="/student/loadtest"
              />
              <JourneyStep
                number="03"
                title="Observe System Behavior"
                description="Track resource usage, service trends, and stability from monitoring dashboards."
                ctaLabel="Open Monitoring"
                to="/student/monitoring"
              />
              <JourneyStep
                number="04"
                title="Review Cost & Recommendations"
                description="Compare cloud pricing outcomes and use insights to optimize settings."
                ctaLabel="Open Billing"
                to="/student/billing"
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp} className="space-y-6 lg:col-span-4">
          <Card className="border-slate-900 bg-slate-900 text-white">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
              <CardDescription className="text-slate-300">Start with the most useful pages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickAction to="/student/classes" label="View My Classes" />
              <QuickAction to="/student/deployments" label="Deploy Instance" />
              <QuickAction to="/student/loadtest" label="Run Load Test" />
              <QuickAction to="/student/monitoring" label="System Monitoring" />
              <QuickAction to="/student/billing" label="Open Billing" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Application Highlights</CardTitle>
              <CardDescription>What this project focuses on</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <EnvironmentRow label="Purpose" value="Cloud orchestration learning" />
              <EnvironmentRow label="Engine" value="FastAPI + React + Docker" />
              <EnvironmentRow label="Monitoring" value="Prometheus + Grafana" />
              <EnvironmentRow label="Intelligence" value="AI-powered cost guidance" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Technology Stack</CardTitle>
              <CardDescription>Core tools used in this project</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <StackPill icon={CloudCog} label="Docker" />
              <StackPill icon={Cpu} label="FastAPI" />
              <StackPill icon={Workflow} label="React" />
              <StackPill icon={BarChart3} label="Grafana" />
              <StackPill icon={Gauge} label="Prometheus" />
              <StackPill icon={Bot} label="AI Insights" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Success Checklist</CardTitle>
              <CardDescription>Target outcomes for your first lab</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <ChecklistItem text="Deploy at least one application" />
              <ChecklistItem text="Capture load test metrics" />
              <ChecklistItem text="Observe scaling triggers" />
              <ChecklistItem text="Compare 3 cloud pricing models" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tasks Section */}
      <motion.div variants={fadeInUp} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Assigned Tasks</h2>
            <p className="mt-1 text-sm text-slate-500">Complete your classroom assignments</p>
          </div>
          {tasks.length > 0 && (
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-blue-600">{pendingTasks.length}</span> pending,{' '}
              <span className="font-semibold text-green-600">{completedTasks.length}</span> completed
            </div>
          )}
        </div>

        {isLoadingTasks ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader className="h-8 w-8 animate-spin text-slate-400" />
                <p className="text-slate-500">Loading your tasks...</p>
              </div>
            </CardContent>
          </Card>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 font-medium text-slate-900">No tasks yet</p>
                <p className="text-sm text-slate-500">
                  Your teachers will assign tasks to your classes
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">In Progress & Pending</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendingTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onCompleteClick={handleTaskCardClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Completed</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {completedTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onCompleteClick={handleTaskCardClick}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Task Modal */}
      <CompleteTaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTaskComplete={handleTaskComplete}
      />
    </motion.div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-500" />
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      </div>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  )
}

function HeroStep({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-white/5 px-2.5 py-2 text-slate-100">
      <Icon className="h-4 w-4 text-slate-300" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

function JourneyStep({
  number,
  title,
  description,
  ctaLabel,
  to,
}: {
  number: string
  title: string
  description: string
  ctaLabel: string
  to: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Step {number}</p>
          <h4 className="mt-1 text-sm font-semibold text-slate-900">{title}</h4>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <Link to={to}>
          <Button variant="outline" size="sm">
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

function StackPill({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <Icon className="h-4 w-4 text-slate-500" />
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </div>
  )
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-slate-500" />
      <span>{text}</span>
    </div>
  )
}

function QuickAction({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="block">
      <Button variant="outline" className="w-full justify-between border-slate-700 bg-transparent text-white hover:bg-slate-800 hover:text-white">
        <span>{label}</span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  )
}

function EnvironmentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  )
}
