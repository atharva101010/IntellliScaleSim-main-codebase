import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, Clock, AlertCircle, Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { tasksApi, type TaskWithCompletion } from '@/utils/api'
import { formatDistanceToNow, parseISO } from 'date-fns'

interface CompleteTaskModalProps {
  task: TaskWithCompletion | null
  isOpen: boolean
  onClose: () => void
  onTaskComplete?: () => void
}

export default function CompleteTaskModal({
  task,
  isOpen,
  onClose,
  onTaskComplete,
}: CompleteTaskModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submissionNotes, setSubmissionNotes] = useState('')
  const [completionStatus, setCompletionStatus] = useState<'pending' | 'in_progress' | 'completed'>('in_progress')

  const isTaskCompleted = task?.student_completion_status === 'completed'
  const isDue = task?.due_at && new Date(task.due_at) < new Date()

  const handleMarkComplete = async () => {
    if (!task) return

    setIsLoading(true)
    setError(null)

    try {
      await tasksApi.markTaskComplete(task.id, {
        status: 'completed',
        submission_notes: submissionNotes,
      })
      setCompletionStatus('completed')
      onTaskComplete?.()
      // Auto-close after a short delay
      setTimeout(() => {
        onClose()
        setSubmissionNotes('')
        setCompletionStatus('in_progress')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark task as complete')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkInProgress = async () => {
    if (!task) return

    setIsLoading(true)
    setError(null)

    try {
      await tasksApi.markTaskComplete(task.id, {
        status: 'in_progress',
        submission_notes: submissionNotes,
      })
      setCompletionStatus('in_progress')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task status')
    } finally {
      setIsLoading(false)
    }
  }

  if (!task) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <Card className="border-slate-200 bg-white shadow-xl">
              {/* Header */}
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4 border-b border-slate-200">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-2xl">{task.title}</CardTitle>
                    <StatusBadge status={task.student_completion_status} />
                  </div>
                  {task.description && (
                    <CardDescription className="text-base">{task.description}</CardDescription>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-500 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </CardHeader>

              {/* Content */}
              <CardContent className="pt-6 space-y-6">
                {/* Meta Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-600">Status</div>
                    <div className="mt-1 flex items-center gap-2">
                      {task.student_completion_status === 'completed' ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <span className="font-semibold text-green-600">Completed</span>
                        </>
                      ) : task.student_completion_status === 'in_progress' ? (
                        <>
                          <Clock className="h-5 w-5 text-blue-600" />
                          <span className="font-semibold text-blue-600">In Progress</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-5 w-5 text-slate-400" />
                          <span className="font-semibold text-slate-500">Not Started</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="text-sm font-medium text-slate-600">Due Date</div>
                    {task.due_at ? (
                      <div className={`mt-1 font-semibold ${isDue ? 'text-red-600' : 'text-slate-900'}`}>
                        {formatDistanceToNow(parseISO(task.due_at), { addSuffix: true })}
                        {isDue && <span className="ml-2 text-xs text-red-600">(Overdue)</span>}
                      </div>
                    ) : (
                      <div className="mt-1 font-semibold text-slate-500">No due date</div>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                {task.instructions && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-900">Task Instructions</h3>
                    <div className="rounded-lg bg-slate-50 p-4 whitespace-pre-wrap text-sm text-slate-700">
                      {task.instructions}
                    </div>
                  </div>
                )}

                {/* Submission Notes */}
                <div className="space-y-3">
                  <label htmlFor="notes" className="block font-semibold text-slate-900">
                    Submission Notes
                  </label>
                  <textarea
                    id="notes"
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    placeholder="Add any notes about your work or completion status..."
                    className="w-full min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={isTaskCompleted || isLoading}
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="rounded-lg bg-red-50 p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-600">{error}</div>
                  </div>
                )}

                {/* Success Message */}
                {completionStatus === 'completed' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-green-50 p-4 flex items-start gap-3"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-green-600">Task Completed!</div>
                      <div className="text-sm text-green-700">Your task completion has been recorded.</div>
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  {isTaskCompleted ? (
                    <Button
                      onClick={onClose}
                      className="flex-1"
                      variant="outline"
                    >
                      Close
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleMarkInProgress}
                        disabled={isLoading || completionStatus === 'in_progress'}
                        className="flex-1"
                        variant="outline"
                      >
                        {isLoading && <Loader className="h-4 w-4 mr-2 animate-spin" />}
                        Mark as In Progress
                      </Button>
                      <Button
                        onClick={handleMarkComplete}
                        disabled={isLoading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        {isLoading ? (
                          <>
                            <Loader className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark as Complete
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function StatusBadge({
  status,
}: {
  status?: 'pending' | 'in_progress' | 'completed' | null
}) {
  const configs = {
    completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
    in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Progress' },
    pending: { bg: 'bg-slate-100', text: 'text-slate-800', label: 'Not Started' },
  }

  const config = status ? configs[status] : configs.pending

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}
