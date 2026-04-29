import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { Plus, Trash2, Save, Loader2, Check } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const DAYS = [
  { value: 1, label: 'จันทร์' },
  { value: 2, label: 'อังคาร' },
  { value: 3, label: 'พุธ' },
  { value: 4, label: 'พฤหัสบดี' },
  { value: 5, label: 'ศุกร์' },
  { value: 6, label: 'เสาร์' },
  { value: 0, label: 'อาทิตย์' },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const [schedule, setSchedule] = useState([])
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  const [newHolidayDate, setNewHolidayDate] = useState('')
  const [newHolidayName, setNewHolidayName] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [{ data: sch }, { data: hol }] = await Promise.all([
      supabase.from('work_schedule').select('*').eq('user_id', user.id).order('day_of_week'),
      supabase.from('holidays').select('*').eq('user_id', user.id).order('holiday_date'),
    ])
    setSchedule(sch || [])
    setHolidays(hol || [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const updateScheduleRow = (dow, patch) => {
    setSchedule(prev => prev.map(s => s.day_of_week === dow ? { ...s, ...patch } : s))
  }

  const saveSchedule = async () => {
    setSaved(false)
    const updates = schedule.map(s =>
      supabase.from('work_schedule')
        .update({
          start_time: s.start_time,
          end_time: s.end_time,
          is_working_day: s.is_working_day,
        })
        .eq('id', s.id)
    )
    await Promise.all(updates)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addHoliday = async (e) => {
    e.preventDefault()
    if (!newHolidayDate || !newHolidayName) return
    const { error } = await supabase.from('holidays').insert([{
      user_id: user.id,
      holiday_date: newHolidayDate,
      holiday_name: newHolidayName,
    }])
    if (error) {
      alert('Error: ' + error.message)
      return
    }
    setNewHolidayDate('')
    setNewHolidayName('')
    await load()
  }

  const deleteHoliday = async (id) => {
    if (!confirm('ลบวันหยุดนี้?')) return
    await supabase.from('holidays').delete().eq('id', id)
    await load()
  }

  if (loading) return <div className="p-8 text-sm text-ink-500">Loading...</div>

  return (
    <div className="min-h-screen">
      <PageHeader title="Settings" subtitle="ตั้งค่าเวลาทำงานและวันหยุด" />

      <div className="p-6 lg:p-8 max-w-3xl space-y-6">
        {/* Work Schedule */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold">เวลาทำงาน</h2>
              <p className="text-xs text-ink-500 mt-0.5">กำหนดวันและเวลาทำงานของคุณ</p>
            </div>
            <button onClick={saveSchedule} className="btn-primary text-xs">
              {saved ? <><Check size={14} /> บันทึกแล้ว</> : <><Save size={14} /> บันทึก</>}
            </button>
          </div>

          <div className="space-y-2">
            {DAYS.map(d => {
              const row = schedule.find(s => s.day_of_week === d.value)
              if (!row) return null
              return (
                <div key={d.value} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800/50">
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={row.is_working_day}
                      onChange={e => updateScheduleRow(d.value, { is_working_day: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium w-20">{d.label}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={row.start_time?.slice(0, 5) || '09:00'}
                      onChange={e => updateScheduleRow(d.value, { start_time: e.target.value })}
                      disabled={!row.is_working_day}
                      className="input w-28 text-xs disabled:opacity-50"
                    />
                    <span className="text-ink-400">–</span>
                    <input
                      type="time"
                      value={row.end_time?.slice(0, 5) || '18:00'}
                      onChange={e => updateScheduleRow(d.value, { end_time: e.target.value })}
                      disabled={!row.is_working_day}
                      className="input w-28 text-xs disabled:opacity-50"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Holidays */}
        <div className="card p-5">
          <div className="mb-4">
            <h2 className="font-display font-bold">วันหยุด</h2>
            <p className="text-xs text-ink-500 mt-0.5">กำหนดวันหยุดเฉพาะของคุณ</p>
          </div>

          <form onSubmit={addHoliday} className="flex gap-2 mb-4">
            <input
              type="date"
              value={newHolidayDate}
              onChange={e => setNewHolidayDate(e.target.value)}
              className="input w-48"
              required
            />
            <input
              type="text"
              value={newHolidayName}
              onChange={e => setNewHolidayName(e.target.value)}
              placeholder="เช่น วันสงกรานต์"
              className="input flex-1"
              required
            />
            <button type="submit" className="btn-primary">
              <Plus size={14} /> เพิ่ม
            </button>
          </form>

          <div className="space-y-1">
            {holidays.length === 0 ? (
              <p className="text-sm text-ink-500 text-center py-6">ยังไม่มีวันหยุดที่กำหนด</p>
            ) : (
              holidays.map(h => (
                <div key={h.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800/50 group">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium w-32">
                      {format(parseISO(h.holiday_date), 'd MMM yyyy')}
                    </span>
                    <span className="text-sm text-ink-700 dark:text-ink-300">{h.holiday_name}</span>
                  </div>
                  <button
                    onClick={() => deleteHoliday(h.id)}
                    className="text-ink-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
