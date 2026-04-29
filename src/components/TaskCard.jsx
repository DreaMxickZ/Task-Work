import { useNavigate } from 'react-router-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, Layers, Repeat, AlertCircle, GripVertical } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { getCategory, getPriority } from '../lib/supabase'

export default function TaskCard({ task, dragHandle = true }) {
  const navigate = useNavigate()
  const cat = getCategory(task.category)
  const pri = getPriority(task.priority)

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const dueLate = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done'
  const dueToday = task.due_date && isToday(new Date(task.due_date))

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-xl p-3.5 shadow-soft hover:shadow-card hover:border-ink-200 dark:hover:border-ink-700 transition-all cursor-pointer"
      onClick={() => navigate(`/task/${task.id}`)}
    >
      <div className="flex items-start gap-2">
        {dragHandle && (
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="text-ink-300 hover:text-ink-500 dark:text-ink-600 dark:hover:text-ink-400 cursor-grab active:cursor-grabbing mt-0.5 -ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Drag"
          >
            <GripVertical size={14} />
          </button>
        )}

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start gap-2">
            <h3 className="font-medium text-sm leading-snug flex-1">{task.title}</h3>
            {(task.priority === 'high' || task.priority === 'urgent') && (
              <AlertCircle size={14} className={pri.color + ' shrink-0 mt-0.5'} />
            )}
          </div>

          {task.description && (
            <p className="text-xs text-ink-500 dark:text-ink-400 line-clamp-2">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`chip ${cat.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
              {cat.label}
            </span>

            <span className="chip bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300">
              {task.task_type === 'project' ? <Layers size={11} /> : <Repeat size={11} />}
              {task.task_type === 'project' ? 'Project' : 'Routine'}
            </span>

            {task.tags?.slice(0, 2).map(tag => (
              <span key={tag} className="chip bg-ink-50 dark:bg-ink-800/50 text-ink-600 dark:text-ink-400 border border-ink-100 dark:border-ink-700">
                #{tag}
              </span>
            ))}
          </div>

          {task.due_date && (
            <div className={`flex items-center gap-1 text-xs ${
              dueLate ? 'text-red-600' : dueToday ? 'text-orange-600' : 'text-ink-500'
            }`}>
              <Calendar size={12} />
              {format(new Date(task.due_date), 'd MMM, HH:mm')}
              {dueLate && <span className="font-medium">• เลยกำหนด</span>}
              {dueToday && !dueLate && <span className="font-medium">• วันนี้</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
