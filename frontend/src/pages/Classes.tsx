import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Plus, Users, BookOpen, Calendar, Search, Trash2, Edit2, Eye } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { classesApi, type TeacherClass } from '@/utils/api'

interface ClassItem {
  id: number
  name: string
  code: string
  description: string
  students: number
  maxStudents: number
  semester: string
  status: 'active' | 'archived' | 'upcoming'
  createdAt: string
  deploymentsCount: number
}

const mapTeacherClass = (item: TeacherClass): ClassItem => ({
  id: item.id,
  name: item.name,
  code: item.code,
  description: item.description || '',
  students: item.student_count,
  maxStudents: item.max_students,
  semester: item.semester,
  status: item.status,
  createdAt: item.created_at,
  deploymentsCount: item.deployments_count,
})

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function Classes() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived' | 'upcoming'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    description: '',
    maxStudents: 30,
    semester: 'Spring 2026',
  })
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const loadClasses = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await classesApi.listTeacherClasses()
      setClasses(response.map(mapTeacherClass))
    } catch (err: any) {
      setError(err?.message || 'Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadClasses()
  }, [])

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.code.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [classes, searchQuery, statusFilter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>
      case 'archived':
        return <Badge variant="secondary">Archived</Badge>
      case 'upcoming':
        return <Badge variant="warning">Upcoming</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const stats = {
    totalClasses: classes.length,
    activeClasses: classes.filter(c => c.status === 'active').length,
    totalStudents: classes.reduce((sum, c) => sum + c.students, 0),
    totalDeployments: classes.reduce((sum, c) => sum + c.deploymentsCount, 0),
  }

  const handleCreateClass = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreateSubmitting(true)
    setCreateError(null)

    try {
      await classesApi.createTeacherClass({
        name: createForm.name,
        code: createForm.code,
        description: createForm.description,
        semester: createForm.semester,
        max_students: createForm.maxStudents,
      })

      setShowCreateModal(false)
      setCreateForm({
        name: '',
        code: '',
        description: '',
        maxStudents: 30,
        semester: 'Spring 2026',
      })
      await loadClasses()
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create class')
    } finally {
      setCreateSubmitting(false)
    }
  }

  return (
    <motion.div className="space-y-6" initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}>
      {/* Header */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Classes</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your classes, students, and lab environments</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Class
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Classes</CardDescription>
            <CardTitle className="text-2xl">{stats.totalClasses}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Classes</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.activeClasses}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Students</CardDescription>
            <CardTitle className="text-2xl">{stats.totalStudents}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Deployments</CardDescription>
            <CardTitle className="text-2xl">{stats.totalDeployments}</CardTitle>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeInUp} className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'upcoming', 'archived'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </motion.div>

      {error && (
        <motion.div variants={fadeInUp} className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </motion.div>
      )}

      {loading && (
        <motion.div variants={fadeInUp} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Loading classes...
        </motion.div>
      )}

      {/* Classes Grid */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredClasses.map((classItem) => (
          <Card key={classItem.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardDescription className="font-mono text-xs">{classItem.code}</CardDescription>
                  <CardTitle className="text-lg mt-1">{classItem.name}</CardTitle>
                </div>
                {getStatusBadge(classItem.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 line-clamp-2">{classItem.description}</p>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="h-4 w-4" />
                  <span>{classItem.students}/{classItem.maxStudents} students</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-4 w-4" />
                  <span>{classItem.semester}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <BookOpen className="h-4 w-4" />
                  <span>{classItem.deploymentsCount} deployments</span>
                </div>
              </div>

              {/* Progress bar for enrollment */}
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Enrollment</span>
                  <span>{Math.round((classItem.students / classItem.maxStudents) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-900 rounded-full transition-all"
                    style={{ width: `${(classItem.students / classItem.maxStudents) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedClass(classItem)
                    setShowDetailsModal(true)
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button variant="outline" size="sm">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {!loading && filteredClasses.length === 0 && (
        <motion.div variants={fadeInUp} className="text-center py-12">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No classes found</h3>
          <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filter criteria</p>
        </motion.div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
          >
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Create New Class</h2>
            <form className="space-y-4" onSubmit={handleCreateClass}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class Name</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Cloud Computing Fundamentals"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class Code</label>
                <input
                  type="text"
                  value={createForm.code}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g., CS-401"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the class..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Students</label>
                  <input
                    type="number"
                    value={createForm.maxStudents}
                    onChange={(e) => setCreateForm((prev) => ({
                      ...prev,
                      maxStudents: Math.max(1, parseInt(e.target.value || '1', 10)),
                    }))}
                    min={1}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
                  <select
                    value={createForm.semester}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, semester: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                  >
                    <option>Spring 2026</option>
                    <option>Fall 2026</option>
                    <option>Spring 2027</option>
                  </select>
                </div>
              </div>
              {createError && (
                <p className="text-sm text-red-600">{createError}</p>
              )}
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createSubmitting}>
                  {createSubmitting ? 'Creating...' : 'Create Class'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Class Details Modal */}
      {showDetailsModal && selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm font-mono text-slate-500">{selectedClass.code}</p>
                <h2 className="text-xl font-semibold text-slate-900">{selectedClass.name}</h2>
              </div>
              {getStatusBadge(selectedClass.status)}
            </div>
            
            <p className="text-slate-600 mb-6">{selectedClass.description}</p>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900">Class Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Semester</span>
                    <span className="font-medium">{selectedClass.semester}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Created</span>
                    <span className="font-medium">{new Date(selectedClass.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Deployments</span>
                    <span className="font-medium">{selectedClass.deploymentsCount}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900">Enrollment</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current Students</span>
                    <span className="font-medium">{selectedClass.students}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Max Capacity</span>
                    <span className="font-medium">{selectedClass.maxStudents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Available Spots</span>
                    <span className="font-medium">{selectedClass.maxStudents - selectedClass.students}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
              <Button className="flex-1">
                <Users className="h-4 w-4 mr-2" />
                Manage Students
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
