import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO
} from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { useTasks } from '../hooks/useTasks'
import { supabase, getCategory } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function CalendarPage() {
  const { user } = useAuth()
  const { tasks } = useTasks()
  const navigate = useNavigate()

  const [current, setCurrent] = useState(new Date())
  const [holidays, setHolidays] = useState([])
  const [schedule, setSchedule] = useState([])

  useEffect(() => {
    if (!user) return
    supabase.from('holidays').select('*').eq('user_id', user.id).then(({ data }) => setHolidays(data || []))
    supabase.from('work_schedule').select('*').eq('user_id', user.id).then(({ data }) => setSchedule(data || []))
  }, [user])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [current])

  const tasksByDay = useMemo(() => {
    const map = new Map()
    tasks.forEach(t => {
      if (!t.due_date) return
      const k = format(parseISO(t.due_date), 'yyyy-MM-dd')
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(t)
    })
    return map
  }, [tasks])

  const holidaysByDay = useMemo(() => {
    const map = new Map()
    holidays.forEach(h => map.set(h.holiday_date, h))
    return map
  }, [holidays])

  const isWorkingDay = (date) => {
    const dow = date.getDay()
    const cfg = schedule.find(s => s.day_of_week === dow)
    return cfg?.is_working_day ?? true
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="ปฏิทิน"
        subtitle="ดูงานทั้งหมดในมุมมองปฏิทิน"
        actions={
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrent(subMonths(current, 1))} className="btn-ghost p-2">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setCurrent(new Date())} className="btn-secondary text-xs">
              วันนี้
            </button>
            <button onClick={() => setCurrent(addMonths(current, 1))} className="btn-ghost p-2">
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />

      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl font-bold">{format(current, 'MMMM yyyy')}</h2>
          <div className="flex items-center gap-3 text-xs text-ink-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" /> วันหยุด
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-ink-300" /> ไม่ทำงาน
            </span>
          </div>
        </div>

        <div className="card overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-ink-100 dark:border-ink-800">
            {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map(d => (
              <div key={d} className="px-2 py-2.5 text-center text-xs font-medium text-ink-500">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const k = format(day, 'yyyy-MM-dd')
              const dayTasks = tasksByDay.get(k) || []
              const holiday = holidaysByDay.get(k)
              const inMonth = isSameMonth(day, current)
              const today = isToday(day)
              const working = isWorkingDay(day)

              return (
                <div
                  key={k}
                  className={`min-h-[110px] border-b border-r border-ink-100 dark:border-ink-800 p-2 ${
                    !inMonth ? 'bg-ink-50/50 dark:bg-ink-950/50' : ''
                  } ${!working && inMonth ? 'bg-ink-50 dark:bg-ink-900/50' : ''}`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <span className={`text-xs font-medium ${
                      !inMonth ? 'text-ink-300 dark:text-ink-700' :
                      today ? 'text-white bg-ink-900 dark:bg-white dark:text-ink-900 rounded-full w-5 h-5 flex items-center justify-center' :
                      'text-ink-700 dark:text-ink-300'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {holiday && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title={holiday.holiday_name} />}
                  </div>
                  {holiday && (
                    <p className="text-[10px] text-red-600 dark:text-red-400 truncate font-medium mb-1">{holiday.holiday_name}</p>
                  )}
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map(t => {
                      const cat = getCategory(t.category)
                      return (
                        <button
                          key={t.id}
                          onClick={() => navigate(`/task/${t.id}`)}
                          className={`w-full text-left text-[11px] px-1.5 py-0.5 rounded truncate font-medium ${cat.color} hover:opacity-80`}
                        >
                          {t.title}
                        </button>
                      )
                    })}
                    {dayTasks.length > 3 && (
                      <div className="text-[10px] text-ink-500 px-1.5">+{dayTasks.length - 3} อื่นๆ</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <p className="text-xs text-ink-500 mt-3 flex items-center gap-1.5">
          <CalIcon size={12} />
          กำหนดเวลาทำงานและวันหยุดได้ที่หน้า Settings
        </p>
      </div>
    </div>
  )
}
