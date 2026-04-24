import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, AlertCircle, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type TaskWithCompletion } from '@/utils/api'
import { formatDistanceToNow, parseISO } from 'date-fns'

interface TaskCardProps {
  task: TaskWithCompletion
  onCompleteClick: (task: TaskWithCompletion) => void
}

export default function TaskCard({ task, onCompleteClick }: TaskCardProps) {
  const isDue = task.due_at && new Date(task.due_at) < new Date()
  const isCompleted = task.student_completion_status === 'completed'
  const isInProgress = task.student_completion_status === 'in_progress'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <Card className="overflow-hidden border-slate-200 bg-white hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <CardTitle className="text-lg">{task.title}</CardTitle>
              </div>
              {task.description && (
                <CardDescription className="line-clamp-2">{task.description}</CardDescription>
              )}
            </div>
            <StatusIcon status={task.student_completion_status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Meta Information */}
          <div className="flex flex-wrap gap-3 text-sm">
            {/* Due Date */}
            {task.due_at && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50">
                <Clock className={`h-4 w-4 ${isDue ? 'text-red-600' : 'text-slate-600'}`} />
                <span className={isDue ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                  Due {formatDistanceToNow(parseISO(task.due_at), { addSuffix: true })}
                </span>
              </div>
            )}

            {/* Status Badge */}
            <div className={`px-3 py-1.5 rounded-full font-semibold text-xs uppercase tracking-wide ${
              isCompleted
                ? 'bg-green-100 text-green-700'
                : isInProgress
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-700'
            }`}>
              {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Not Started'}
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={() => onCompleteClick(task)}
            disabled={isCompleted}
            className={`w-full ${
              isCompleted
                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Task Completed
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4 mr-2" />
                Complete Task
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function StatusIcon({
  status,
}: {
  status?: 'pending' | 'in_progress' | 'completed' | null
}) {
  switch (status) {
    case 'completed':
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </motion.div>
      )
    case 'in_progress':
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        >
          <Clock className="h-6 w-6 text-blue-600" />
        </motion.div>
      )
    default:
      return <AlertCircle className="h-6 w-6 text-slate-400" />
  }
}
