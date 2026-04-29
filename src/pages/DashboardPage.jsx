import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clock, AlertCircle, ListTodo, ArrowRight } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import TaskCard from '../components/TaskCard'
import { useTasks } from '../hooks/useTasks'
import { CATEGORIES } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { isThisMonth, isPast } from 'date-fns'

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-xs text-ink-500 dark:text-ink-400">{label}</p>
          <p className="font-display text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { tasks } = useTasks()

  const stats = useMemo(() => {
    const total = tasks.length
    const todo = tasks.filter(t => t.status === 'todo').length
    const inProg = tasks.filter(t => t.status === 'in_progress').length
    const doneThisMonth = tasks.filter(t =>
      t.status === 'done' && t.completed_at && isThisMonth(new Date(t.completed_at))
    ).length
    const overdue = tasks.filter(t =>
      t.status !== 'done' && t.due_date && isPast(new Date(t.due_date))
    ).length
    return { total, todo, inProg, doneThisMonth, overdue }
  }, [tasks])

  const byCategory = useMemo(() => {
    return CATEGORIES.map(cat => {
      const items = tasks.filter(t => t.category === cat.value && t.status !== 'done')
      return { ...cat, count: items.length, items }
    })
  }, [tasks])

  const upcoming = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'done' && t.due_date)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 5)
  }, [tasks])

  const recentDone = useMemo(() => {
    return tasks
      .filter(t => t.status === 'done')
      .sort((a, b) => new Date(b.completed_at || b.updated_at) - new Date(a.completed_at || a.updated_at))
      .slice(0, 3)
  }, [tasks])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'อรุณสวัสดิ์'
    if (h < 17) return 'สวัสดีตอนบ่าย'
    return 'สวัสดีตอนเย็น'
  }, [])

  const name = user?.user_metadata?.display_name || user?.email?.split('@')[0]

  return (
    <div className="min-h-screen">
      <PageHeader title={`${greeting}, ${name}`} subtitle="ภาพรวมงานของคุณวันนี้" />

      <div className="p-6 lg:p-8 space-y-6 max-w-7xl">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={ListTodo} label="To Do" value={stats.todo} accent="bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300" />
          <StatCard icon={Clock} label="In Progress" value={stats.inProg} accent="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" />
          <StatCard icon={CheckCircle2} label="เสร็จเดือนนี้" value={stats.doneThisMonth} accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" />
          <StatCard icon={AlertCircle} label="เลยกำหนด" value={stats.overdue} accent="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" />
        </div>

        {/* By Category */}
        <div>
          <h2 className="font-display font-bold text-lg mb-3">งานตามหมวด</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {byCategory.map(cat => (
              <Link
                key={cat.value}
                to={`/board/${cat.value}`}
                className="card p-5 hover:shadow-card transition-shadow group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${cat.dot}`} />
                    <h3 className="font-display font-bold">{cat.label}</h3>
                  </div>
                  <ArrowRight size={16} className="text-ink-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="font-display text-3xl font-bold">{cat.count}</p>
                <p className="text-xs text-ink-500 mt-1">งานที่ยังไม่เสร็จ</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming + Recent done */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="font-display font-bold text-lg mb-3">งานที่กำลังจะถึงกำหนด</h2>
            <div className="space-y-2">
              {upcoming.length === 0 ? (
                <div className="card p-8 text-center text-sm text-ink-500">
                  ไม่มีงานที่ใกล้กำหนด ✨
                </div>
              ) : (
                upcoming.map(t => <TaskCard key={t.id} task={t} dragHandle={false} />)
              )}
            </div>
          </div>

          <div>
            <h2 className="font-display font-bold text-lg mb-3">งานที่เพิ่งเสร็จ</h2>
            <div className="space-y-2">
              {recentDone.length === 0 ? (
                <div className="card p-8 text-center text-sm text-ink-500">
                  ยังไม่มีงานที่เสร็จ
                </div>
              ) : (
                recentDone.map(t => <TaskCard key={t.id} task={t} dragHandle={false} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
