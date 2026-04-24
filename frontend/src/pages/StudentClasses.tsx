import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, CalendarDays, Layers3, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { classesApi, type StudentClass } from '@/utils/api'

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

function formatDate(value: string | null): string {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function getStatusBadge(status: StudentClass['status']) {
  if (status === 'active') return <Badge variant="success">Active</Badge>
  if (status === 'upcoming') return <Badge variant="warning">Upcoming</Badge>
  return <Badge variant="secondary">Archived</Badge>
}

export default function StudentClasses() {
  const [classes, setClasses] = useState<StudentClass[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadClasses = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await classesApi.listStudentClasses()
        setClasses(response)
      } catch (err: any) {
        setError(err?.message || 'Failed to load enrolled classes')
      } finally {
        setLoading(false)
      }
    }

    void loadClasses()
  }, [])

  const stats = useMemo(() => {
    return {
      total: classes.length,
      active: classes.filter((item) => item.status === 'active').length,
    }
  }, [classes])

  return (
    <motion.div className="space-y-6" initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
      <motion.div variants={fadeInUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">My Classes</h1>
          <p className="mt-1 text-sm text-slate-500">Classes assigned by your teacher appear here.</p>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Assigned Classes</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Classes</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
      </motion.div>

      {error && (
        <motion.div variants={fadeInUp} className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </motion.div>
      )}

      {loading ? (
        <motion.div variants={fadeInUp} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Loading classes...
        </motion.div>
      ) : classes.length === 0 ? (
        <motion.div variants={fadeInUp} className="rounded-lg border border-slate-200 bg-white px-6 py-8 text-center">
          <BookOpen className="mx-auto mb-2 h-6 w-6 text-slate-400" />
          <h3 className="text-base font-medium text-slate-900">No classes assigned yet</h3>
          <p className="mt-1 text-sm text-slate-500">Ask your teacher to enroll you in a class.</p>
        </motion.div>
      ) : (
        <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {classes.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardDescription className="font-mono text-xs">{item.code}</CardDescription>
                    <CardTitle className="mt-1 text-lg">{item.name}</CardTitle>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                {item.description && <p>{item.description}</p>}

                <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500">Semester</p>
                      <p className="font-medium text-slate-900">{item.semester}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500">Students</p>
                      <p className="font-medium text-slate-900">{item.student_count}/{item.max_students}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers3 className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-xs text-slate-500">Deployments</p>
                      <p className="font-medium text-slate-900">{item.deployments_count}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Assigned On</p>
                    <p className="font-medium text-slate-900">{formatDate(item.enrolled_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
