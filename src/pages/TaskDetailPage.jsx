import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ArrowLeft, Edit2, Trash2, Plus, ImageIcon, Send, Loader2,
  Layers, MessageSquare, X, ExternalLink, Check
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import TaskModal from '../components/TaskModal'
import { supabase, getCategory, getPriority, STATUSES } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function TaskDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [task, setTask] = useState(null)
  const [versions, setVersions] = useState([])
  const [logs, setLogs] = useState([])
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [activeVersionId, setActiveVersionId] = useState(null)

  const [newLog, setNewLog] = useState('')
  const [logType, setLogType] = useState('progress')
  const [pendingFiles, setPendingFiles] = useState([])
  const [posting, setPosting] = useState(false)

  // สำหรับแก้ไข log
  const [editingLogId, setEditingLogId] = useState(null)
  const [editingContent, setEditingContent] = useState('')
  const [editingType, setEditingType] = useState('progress')
  const [savingEdit, setSavingEdit] = useState(false)

  const [newVersionOpen, setNewVersionOpen] = useState(false)

  const load = useCallback(async () => {
    if (!id || !user) return
    setLoading(true)
    const [{ data: t }, { data: v }, { data: l }, { data: a }] = await Promise.all([
      supabase.from('tasks').select('*').eq('id', id).single(),
      supabase.from('project_versions').select('*').eq('task_id', id).order('version_number', { ascending: true }),
      supabase.from('progress_logs').select('*').eq('task_id', id).order('created_at', { ascending: false }),
      supabase.from('task_attachments').select('*').eq('task_id', id).order('created_at', { ascending: false }),
    ])
    setTask(t)
    setVersions(v || [])
    setLogs(l || [])
    setAttachments(a || [])
    setLoading(false)
  }, [id, user])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (status) => {
    const updates = { status }
    if (status === 'done') updates.completed_at = new Date().toISOString()
    else updates.completed_at = null
    const { data } = await supabase.from('tasks').update(updates).eq('id', id).select().single()
    setTask(data)
  }

  const handleDelete = async () => {
    if (!confirm('ลบงานนี้และข้อมูลที่เกี่ยวข้องทั้งหมด?')) return
    await supabase.from('tasks').delete().eq('id', id)
    navigate('/')
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    setPendingFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  const removePending = (idx) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const uploadFile = async (file) => {
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('task-attachments')
      .upload(path, file)
    if (upErr) throw upErr
    const { data: pub } = supabase.storage.from('task-attachments').getPublicUrl(path)
    return { path, url: pub.publicUrl, name: file.name, type: file.type, size: file.size }
  }

  const postLog = async () => {
    if (!newLog.trim() && pendingFiles.length === 0) return
    setPosting(true)
    try {
      let logRow = null
      if (newLog.trim()) {
        const { data, error } = await supabase
          .from('progress_logs')
          .insert([{
            task_id: id,
            user_id: user.id,
            content: newLog.trim(),
            log_type: logType,
            version_id: activeVersionId,
          }])
          .select()
          .single()
        if (error) throw error
        logRow = data
      }

      // Upload files
      for (const file of pendingFiles) {
        const uploaded = await uploadFile(file)
        await supabase.from('task_attachments').insert([{
          task_id: id,
          log_id: logRow?.id,
          user_id: user.id,
          file_name: uploaded.name,
          file_path: uploaded.path,
          file_url: uploaded.url,
          file_type: uploaded.type,
          file_size: uploaded.size,
        }])
      }

      setNewLog('')
      setPendingFiles([])
      await load()
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setPosting(false)
    }
  }

  const deleteLog = async (logId) => {
    if (!confirm('ลบ log นี้?')) return
    await supabase.from('progress_logs').delete().eq('id', logId)
    await load()
  }

  // เริ่มแก้ไข log
  const startEditLog = (log) => {
    setEditingLogId(log.id)
    setEditingContent(log.content)
    setEditingType(log.log_type)
  }

  // ยกเลิกการแก้ไข
  const cancelEditLog = () => {
    setEditingLogId(null)
    setEditingContent('')
    setEditingType('progress')
  }

  // บันทึกการแก้ไข
  const saveEditLog = async () => {
    if (!editingContent.trim()) return
    setSavingEdit(true)
    const { error } = await supabase
      .from('progress_logs')
      .update({
        content: editingContent.trim(),
        log_type: editingType,
      })
      .eq('id', editingLogId)
    setSavingEdit(false)
    if (error) {
      alert('แก้ไขไม่สำเร็จ: ' + error.message)
      return
    }
    cancelEditLog()
    await load()
  }

  const createVersion = async (versionName, description) => {
    const nextNum = (versions.at(-1)?.version_number || 0) + 1
    const { error } = await supabase.from('project_versions').insert([{
      task_id: id,
      user_id: user.id,
      version_number: nextNum,
      version_name: versionName || `Version ${nextNum}`,
      description,
      status: 'planning',
      started_at: new Date().toISOString(),
    }])
    if (error) alert('Error: ' + error.message)
    else {
      setNewVersionOpen(false)
      await load()
    }
  }

  const updateVersionStatus = async (vid, status) => {
    const updates = { status }
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    await supabase.from('project_versions').update(updates).eq('id', vid)
    await load()
  }

  if (loading) {
    return <div className="p-8 text-sm text-ink-500">Loading...</div>
  }
  if (!task) {
    return <div className="p-8 text-sm text-ink-500">ไม่พบงานนี้</div>
  }

  const cat = getCategory(task.category)
  const pri = getPriority(task.priority)

  // กรอง logs ตาม version ที่เลือก (null = แสดงทั้งหมด)
  const filteredLogs = activeVersionId === null
    ? logs
    : logs.filter(l => l.version_id === activeVersionId)

  // attachments ที่ผูกกับ task โดยตรง (ไม่ใช่กับ log)
  const taskAttachments = attachments.filter(a => !a.log_id)

  // หา attachment ของ log
  const getLogAttachments = (logId) => attachments.filter(a => a.log_id === logId)

  return (
    <div className="min-h-screen">
      <PageHeader
        title={task.title}
        subtitle={cat.label + ' · ' + (task.task_type === 'project' ? 'Project' : 'Routine')}
        actions={
          <>
            <button onClick={() => navigate(-1)} className="btn-ghost">
              <ArrowLeft size={16} /> กลับ
            </button>
            <button onClick={() => setEditOpen(true)} className="btn-secondary">
              <Edit2 size={14} /> แก้ไข
            </button>
            <button onClick={handleDelete} className="btn-ghost text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 size={16} />
            </button>
          </>
        }
      />

      <div className="p-6 lg:p-8 max-w-5xl space-y-6">
        {/* Task summary */}
        <div className="card p-5">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`chip ${cat.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
              {cat.label}
            </span>
            <span className={`chip ${pri.color} bg-ink-100 dark:bg-ink-800`}>
              {pri.label}
            </span>
            {task.tags?.map(t => (
              <span key={t} className="chip bg-ink-50 dark:bg-ink-800/50 text-ink-600 dark:text-ink-400 border border-ink-100 dark:border-ink-700">
                #{t}
              </span>
            ))}
          </div>

          {task.description && (
            <p className="text-sm text-ink-700 dark:text-ink-300 whitespace-pre-wrap mb-4">
              {task.description}
            </p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-ink-500 mb-0.5">เริ่ม</p>
              <p className="font-medium">{task.start_date ? format(new Date(task.start_date), 'd MMM yy, HH:mm') : '—'}</p>
            </div>
            <div>
              <p className="text-ink-500 mb-0.5">กำหนดเสร็จ</p>
              <p className="font-medium">{task.due_date ? format(new Date(task.due_date), 'd MMM yy, HH:mm') : '—'}</p>
            </div>
            <div>
              <p className="text-ink-500 mb-0.5">เสร็จเมื่อ</p>
              <p className="font-medium">{task.completed_at ? format(new Date(task.completed_at), 'd MMM yy, HH:mm') : '—'}</p>
            </div>
            <div>
              <p className="text-ink-500 mb-0.5">สถานะ</p>
              <select
                value={task.status}
                onChange={e => handleStatusChange(e.target.value)}
                className="text-xs font-medium bg-transparent border border-ink-200 dark:border-ink-700 rounded-md px-2 py-1"
              >
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Project Versions */}
        {task.task_type === 'project' && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-ink-500" />
                <h2 className="font-display font-bold">Versions</h2>
              </div>
              <button onClick={() => setNewVersionOpen(true)} className="btn-secondary text-xs">
                <Plus size={12} /> Version ใหม่
              </button>
            </div>

            {/* Version tabs */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              <button
                onClick={() => setActiveVersionId(null)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeVersionId === null
                    ? 'bg-ink-900 dark:bg-white text-white dark:text-ink-900'
                    : 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700'
                }`}
              >
                ทุก version
              </button>
              {versions.map(v => (
                <button
                  key={v.id}
                  onClick={() => setActiveVersionId(v.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeVersionId === v.id
                      ? 'bg-ink-900 dark:bg-white text-white dark:text-ink-900'
                      : 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700'
                  }`}
                >
                  v{v.version_number} {v.version_name && '· ' + v.version_name}
                </button>
              ))}
            </div>

            {/* Active version detail */}
            {activeVersionId && (() => {
              const v = versions.find(x => x.id === activeVersionId)
              if (!v) return null
              return (
                <div className="rounded-lg bg-ink-50 dark:bg-ink-800/50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display font-bold">
                      Version {v.version_number} {v.version_name && '· ' + v.version_name}
                    </h3>
                    <select
                      value={v.status}
                      onChange={e => updateVersionStatus(v.id, e.target.value)}
                      className="text-xs font-medium bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 rounded-md px-2 py-1"
                    >
                      <option value="planning">Planning</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  {v.description && (
                    <p className="text-sm text-ink-700 dark:text-ink-300 whitespace-pre-wrap">{v.description}</p>
                  )}
                  <div className="flex gap-4 text-xs text-ink-500">
                    {v.started_at && <span>เริ่ม: {format(new Date(v.started_at), 'd MMM yy')}</span>}
                    {v.completed_at && <span>เสร็จ: {format(new Date(v.completed_at), 'd MMM yy')}</span>}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Add log */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} className="text-ink-500" />
            <h2 className="font-display font-bold">บันทึกความคืบหน้า</h2>
            {activeVersionId && (
              <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                สำหรับ v{versions.find(v => v.id === activeVersionId)?.version_number}
              </span>
            )}
          </div>

          <textarea
            rows={3}
            value={newLog}
            onChange={e => setNewLog(e.target.value)}
            placeholder="ทำอะไรไปบ้าง? ทำถึงไหนแล้ว? อะไรเสร็จแล้วบ้าง..."
            className="input resize-none mb-3"
          />

          {/* Pending files preview */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {pendingFiles.map((f, i) => (
                <div key={i} className="relative group">
                  {f.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-lg border border-ink-200 dark:border-ink-700" />
                  ) : (
                    <div className="w-16 h-16 bg-ink-100 dark:bg-ink-800 rounded-lg flex items-center justify-center text-xs text-ink-500 px-1 text-center">
                      {f.name.slice(0, 10)}...
                    </div>
                  )}
                  <button
                    onClick={() => removePending(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-ink-900 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <select
                value={logType}
                onChange={e => setLogType(e.target.value)}
                className="text-xs bg-ink-50 dark:bg-ink-800 border border-ink-200 dark:border-ink-700 rounded-md px-2 py-1.5"
              >
                <option value="progress">Progress</option>
                <option value="note">Note</option>
                <option value="milestone">Milestone</option>
                <option value="issue">Issue</option>
              </select>
              <label className="btn-ghost cursor-pointer text-xs">
                <ImageIcon size={14} />
                แนบรูป/ไฟล์
                <input type="file" multiple onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
            <button
              onClick={postLog}
              disabled={posting || (!newLog.trim() && pendingFiles.length === 0)}
              className="btn-primary text-xs"
            >
              {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              บันทึก
            </button>
          </div>
        </div>

        {/* Logs timeline */}
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="card p-8 text-center text-sm text-ink-500">
              ยังไม่มีบันทึก เริ่มเขียนข้างบนได้เลย
            </div>
          ) : (
            filteredLogs.map(log => {
              const logAtt = getLogAttachments(log.id)
              const v = log.version_id ? versions.find(x => x.id === log.version_id) : null
              const isEditing = editingLogId === log.id
              return (
                <div key={log.id} className="card p-4 group">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      {isEditing ? (
                        <select
                          value={editingType}
                          onChange={e => setEditingType(e.target.value)}
                          className="text-xs bg-ink-50 dark:bg-ink-800 border border-ink-200 dark:border-ink-700 rounded-md px-2 py-1"
                        >
                          <option value="progress">Progress</option>
                          <option value="note">Note</option>
                          <option value="milestone">Milestone</option>
                          <option value="issue">Issue</option>
                        </select>
                      ) : (
                        <span className={`chip ${
                          log.log_type === 'milestone' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                          log.log_type === 'issue' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                          log.log_type === 'note' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        }`}>
                          {log.log_type}
                        </span>
                      )}
                      {v && <span className="text-ink-500">v{v.version_number}</span>}
                      <span className="text-ink-500">{format(new Date(log.created_at), 'd MMM yy, HH:mm')}</span>
                    </div>

                    {/* ปุ่ม action: แก้ไข / ลบ / save / cancel */}
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={cancelEditLog}
                          disabled={savingEdit}
                          className="text-ink-500 hover:text-ink-900 dark:hover:text-white p-1"
                          title="ยกเลิก"
                        >
                          <X size={14} />
                        </button>
                        <button
                          onClick={saveEditLog}
                          disabled={savingEdit || !editingContent.trim()}
                          className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50 p-1"
                          title="บันทึก"
                        >
                          {savingEdit ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditLog(log)}
                          className="text-ink-300 hover:text-ink-700 dark:hover:text-ink-300 p-1"
                          title="แก้ไข"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteLog(log.id)}
                          className="text-ink-300 hover:text-red-600 p-1"
                          title="ลบ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <textarea
                      autoFocus
                      rows={4}
                      value={editingContent}
                      onChange={e => setEditingContent(e.target.value)}
                      className="input resize-none mb-2"
                      placeholder="เขียนรายละเอียด..."
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap mb-2">{log.content}</p>
                  )}
                  {logAtt.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {logAtt.map(a => (
                        <a
                          key={a.id} href={a.file_url} target="_blank" rel="noreferrer"
                          className="block group/img"
                        >
                          {a.file_type?.startsWith('image/') ? (
                            <img src={a.file_url} alt={a.file_name} className="w-24 h-24 object-cover rounded-lg border border-ink-200 dark:border-ink-700" />
                          ) : (
                            <div className="w-24 h-24 bg-ink-100 dark:bg-ink-800 rounded-lg flex flex-col items-center justify-center text-xs text-ink-500 px-2 text-center">
                              <ExternalLink size={14} className="mb-1" />
                              <span className="truncate w-full">{a.file_name}</span>
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Task-level attachments (uploaded ก่อนเริ่มมี logs) */}
        {taskAttachments.length > 0 && (
          <div className="card p-5">
            <h3 className="font-display font-bold mb-3 text-sm">ไฟล์แนบของงาน</h3>
            <div className="flex flex-wrap gap-2">
              {taskAttachments.map(a => (
                <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer">
                  {a.file_type?.startsWith('image/') ? (
                    <img src={a.file_url} alt="" className="w-24 h-24 object-cover rounded-lg" />
                  ) : (
                    <div className="w-24 h-24 bg-ink-100 dark:bg-ink-800 rounded-lg flex items-center justify-center text-xs">
                      {a.file_name}
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <TaskModal
        open={editOpen}
        initial={task}
        onClose={() => setEditOpen(false)}
        onSave={async (data) => {
          const { data: updated } = await supabase.from('tasks').update(data).eq('id', id).select().single()
          setTask(updated)
          setEditOpen(false)
        }}
      />

      {/* New Version Modal */}
      {newVersionOpen && (
        <NewVersionModal
          onClose={() => setNewVersionOpen(false)}
          onSave={createVersion}
          nextNum={(versions.at(-1)?.version_number || 0) + 1}
        />
      )}
    </div>
  )
}

function NewVersionModal({ onClose, onSave, nextNum }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-ink-900 rounded-2xl w-full max-w-md shadow-card border border-ink-100 dark:border-ink-800" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100 dark:border-ink-800">
          <h2 className="font-display font-bold">Version {nextNum} ใหม่</h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900"><X size={20} /></button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            await onSave(name, desc)
            setSaving(false)
          }}
          className="p-5 space-y-4"
        >
          <div>
            <label className="label">ชื่อ Version (optional)</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder={`เช่น MVP, Beta, v${nextNum}.0`}
              className="input"
            />
          </div>
          <div>
            <label className="label">รายละเอียด - จะทำอะไรใน version นี้</label>
            <textarea
              rows={5} value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="ใน version นี้จะ...&#10;- เพิ่ม feature X&#10;- แก้ bug Y&#10;- ปรับ UI Z"
              className="input resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">ยกเลิก</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 size={14} className="animate-spin" />}
              สร้าง
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}