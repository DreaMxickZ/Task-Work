import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase env. Copy .env.example → .env แล้วใส่ค่า')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// ค่าคงที่ที่ใช้ทั้งแอป
export const CATEGORIES = [
  { value: 'it_support', label: 'IT Support', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', dot: 'bg-blue-500' },
  { value: 'data_analytic', label: 'Data Analytic', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  { value: 'media_ai', label: 'Media & AI', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', dot: 'bg-violet-500' },
]

export const STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

export const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-ink-500' },
  { value: 'normal', label: 'Normal', color: 'text-ink-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-600' },
]

export function getCategory(value) {
  return CATEGORIES.find(c => c.value === value) || CATEGORIES[0]
}
export function getPriority(value) {
  return PRIORITIES.find(p => p.value === value) || PRIORITIES[1]
}
