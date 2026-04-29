import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useTasks(filters = {}) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    if (!user) return
    setLoading(true)
    let query = supabase.from('tasks').select('*').eq('user_id', user.id)
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.task_type) query = query.eq('task_type', filters.task_type)
    query = query.order('sort_order', { ascending: true }).order('created_at', { ascending: false })
    const { data, error } = await query
    if (error) console.error('fetchTasks error:', error)
    else setTasks(data || [])
    setLoading(false)
  }, [user, filters.category, filters.task_type])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const createTask = async (task) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ ...task, user_id: user.id }])
      .select()
      .single()
    if (!error) setTasks(prev => [data, ...prev])
    return { data, error }
  }

  const updateTask = async (id, updates) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error) setTasks(prev => prev.map(t => t.id === id ? data : t))
    return { data, error }
  }

  const deleteTask = async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) setTasks(prev => prev.filter(t => t.id !== id))
    return { error }
  }

  return { tasks, loading, refetch: fetchTasks, createTask, updateTask, deleteTask }
}
