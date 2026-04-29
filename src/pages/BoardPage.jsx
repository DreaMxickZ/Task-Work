import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  useDroppable
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Search, Filter } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import TaskCard from '../components/TaskCard'
import TaskModal from '../components/TaskModal'
import { useTasks } from '../hooks/useTasks'
import { CATEGORIES, STATUSES, getCategory } from '../lib/supabase'

function Column({ status, tasks, onAdd }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.value })
  return (
    <div ref={setNodeRef} className={`flex flex-col bg-ink-100/50 dark:bg-ink-900/50 rounded-xl p-3 transition-colors ${isOver ? 'bg-ink-200/60 dark:bg-ink-800/60' : ''}`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm font-bold">{status.label}</h3>
          <span className="text-xs font-medium text-ink-500 bg-white dark:bg-ink-800 px-1.5 py-0.5 rounded-md">
            {tasks.length}
          </span>
        </div>
        <button onClick={onAdd} className="text-ink-400 hover:text-ink-900 dark:hover:text-white">
          <Plus size={16} />
        </button>
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 min-h-[200px]">
          {tasks.map(task => <TaskCard key={task.id} task={task} />)}
          {tasks.length === 0 && (
            <button onClick={onAdd} className="w-full py-8 border-2 border-dashed border-ink-200 dark:border-ink-700 rounded-xl text-xs text-ink-400 hover:border-ink-300 dark:hover:border-ink-600 hover:text-ink-600 transition-colors">
              + เพิ่มงาน
            </button>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export default function BoardPage() {
  const { category } = useParams()
  const { tasks, createTask, updateTask } = useTasks(category ? { category } : {})

  const [modalOpen, setModalOpen] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 5 }
  }))

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (typeFilter !== 'all' && t.task_type !== typeFilter) return false
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
          !(t.description || '').toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [tasks, search, typeFilter])

  const grouped = useMemo(() => {
    const out = { todo: [], in_progress: [], done: [] }
    filtered.forEach(t => out[t.status]?.push(t))
    return out
  }, [filtered])

  const activeTask = useMemo(() => tasks.find(t => t.id === activeId), [tasks, activeId])

  const handleDragStart = (e) => setActiveId(e.active.id)

  const handleDragEnd = async (e) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return

    const activeTask = tasks.find(t => t.id === active.id)
    if (!activeTask) return

    // ถ้าวางบน column id (status)
    const overIsColumn = STATUSES.some(s => s.value === over.id)
    if (overIsColumn) {
      if (activeTask.status !== over.id) {
        const updates = { status: over.id }
        if (over.id === 'done' && activeTask.status !== 'done') updates.completed_at = new Date().toISOString()
        if (over.id !== 'done') updates.completed_at = null
        await updateTask(active.id, updates)
      }
      return
    }

    // ถ้าวางบน task อื่น (reorder ใน column เดียว หรือย้าย column)
    const overTask = tasks.find(t => t.id === over.id)
    if (!overTask) return

    if (activeTask.status !== overTask.status) {
      const updates = { status: overTask.status }
      if (overTask.status === 'done' && activeTask.status !== 'done') updates.completed_at = new Date().toISOString()
      if (overTask.status !== 'done') updates.completed_at = null
      await updateTask(active.id, updates)
    }
  }

  const title = category ? getCategory(category).label : 'All Tasks'

  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader
        title={title}
        subtitle={`${filtered.length} งาน`}
        actions={
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={16} /> เพิ่มงาน
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหางาน..."
              className="input pl-9"
            />
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Filter size={14} className="text-ink-400" />
            {[
              { v: 'all', l: 'ทั้งหมด' },
              { v: 'routine', l: 'Routine' },
              { v: 'project', l: 'Project' }
            ].map(f => (
              <button
                key={f.v}
                onClick={() => setTypeFilter(f.v)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  typeFilter === f.v
                    ? 'bg-ink-900 dark:bg-white text-white dark:text-ink-900'
                    : 'text-ink-600 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800'
                }`}
              >
                {f.l}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 p-6 lg:p-8 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-[900px]">
            {STATUSES.map(s => (
              <Column
                key={s.value}
                status={s}
                tasks={grouped[s.value] || []}
                onAdd={() => setModalOpen(true)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && <div className="rotate-2"><TaskCard task={activeTask} dragHandle={false} /></div>}
          </DragOverlay>
        </DndContext>
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultCategory={category}
        onSave={async (data) => {
          const { error } = await createTask(data)
          if (!error) setModalOpen(false)
          else alert('เกิดข้อผิดพลาด: ' + error.message)
        }}
      />
    </div>
  )
}
