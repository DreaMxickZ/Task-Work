import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { CATEGORIES, PRIORITIES } from '../lib/supabase'

export default function TaskModal({ open, onClose, onSave, initial = null, defaultCategory = null }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: defaultCategory || 'it_support',
    task_type: 'routine',
    status: 'todo',
    priority: 'normal',
    start_date: '',
    due_date: '',
    is_recurring: false,
    recurrence_pattern: '',
    tags: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title || '',
        description: initial.description || '',
        category: initial.category || 'it_support',
        task_type: initial.task_type || 'routine',
        status: initial.status || 'todo',
        priority: initial.priority || 'normal',
        start_date: initial.start_date ? initial.start_date.slice(0, 16) : '',
        due_date: initial.due_date ? initial.due_date.slice(0, 16) : '',
        is_recurring: initial.is_recurring || false,
        recurrence_pattern: initial.recurrence_pattern || '',
        tags: (initial.tags || []).join(', '),
      })
    } else {
      setForm(f => ({
        ...f,
        title: '', description: '', tags: '',
        start_date: '', due_date: '',
        category: defaultCategory || 'it_support',
        task_type: 'routine', status: 'todo', priority: 'normal',
        is_recurring: false, recurrence_pattern: '',
      }))
    }
  }, [initial, defaultCategory, open])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      task_type: form.task_type,
      status: form.status,
      priority: form.priority,
      start_date: form.start_date || null,
      due_date: form.due_date || null,
      is_recurring: form.task_type === 'routine' ? form.is_recurring : false,
      recurrence_pattern: form.task_type === 'routine' && form.is_recurring && form.recurrence_pattern ? form.recurrence_pattern : null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }
    await onSave(payload)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-ink-900 rounded-2xl w-full max-w-lg shadow-card border border-ink-100 dark:border-ink-800 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100 dark:border-ink-800">
          <h2 className="font-display font-bold">{initial ? 'แก้ไขงาน' : 'งานใหม่'}</h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">หัวข้องาน</label>
            <input
              type="text" required autoFocus
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="input"
              placeholder="เช่น แก้ปัญหา printer แผนกบัญชี"
            />
          </div>

          <div>
            <label className="label">รายละเอียด</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="input resize-none"
              placeholder="อธิบายงาน หรือ requirement..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">หมวด</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="input"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">ประเภท</label>
              <select
                value={form.task_type}
                onChange={e => setForm({ ...form, task_type: e.target.value })}
                className="input"
              >
                <option value="routine">Routine</option>
                <option value="project">Project</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">สถานะ</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="input"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                className="input"
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">เริ่ม</label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">กำหนดเสร็จ</label>
              <input
                type="datetime-local"
                value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Tags (คั่นด้วย ,)</label>
            <input
              type="text"
              value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
              className="input"
              placeholder="urgent, customer, dashboard"
            />
          </div>

          {form.task_type === 'routine' && (
            <div className="rounded-lg border border-ink-200 dark:border-ink-700 p-3 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_recurring}
                  onChange={e => setForm({ ...form, is_recurring: e.target.checked })}
                  className="rounded"
                />
                <span>ทำซ้ำ (recurring)</span>
              </label>
              {form.is_recurring && (
                <select
                  value={form.recurrence_pattern}
                  onChange={e => setForm({ ...form, recurrence_pattern: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">-- เลือกความถี่ --</option>
                  <option value="daily">ทุกวัน</option>
                  <option value="weekly">ทุกสัปดาห์</option>
                  <option value="monthly">ทุกเดือน</option>
                </select>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">ยกเลิก</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {initial ? 'บันทึก' : 'สร้างงาน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
