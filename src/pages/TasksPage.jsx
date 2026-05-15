import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { TaskCard } from '../components/tasks/TaskCard'
import { TaskDetailModal } from '../components/tasks/TaskDetailModal'
import { CreateTaskModal } from '../components/tasks/CreateTaskModal'
import { EmptyState } from '../components/ui/EmptyState'
import { Plus, Filter, LayoutGrid, List } from 'lucide-react'

const STATUSES = ['all', 'assigned', 'in_progress', 'submitted', 'approved', 'rejected']

export default function TasksPage() {
  const { profile } = useAuth()
  const { currentOrg, isAdmin, members } = useOrg()
  const [tasks, setTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentOrg) fetchTasks()
  }, [currentOrg])

  useEffect(() => {
    if (!currentOrg) return
    const channel = supabase.channel(`tasks:${currentOrg.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `org_id=eq.${currentOrg.id}` }, () => fetchTasks())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [currentOrg])

  async function fetchTasks() {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*, task_skill, profiles!tasks_assigned_to_fkey(full_name, avatar_url, skill)')
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false })
    if (data) {
      setTasks(data)
      // Keep open modal in sync with latest task data
      setSelectedTask(prev => prev ? (data.find(t => t.id === prev.id) ?? prev) : null)
    }
    setLoading(false)
  }

  const filtered = tasks.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false
    if (assigneeFilter === 'me' && t.assigned_to !== profile?.id) return false
    if (assigneeFilter !== 'all' && assigneeFilter !== 'me' && t.assigned_to !== assigneeFilter) return false
    return true
  })

  const grouped = {
    assigned: filtered.filter(t => t.status === 'assigned'),
    in_progress: filtered.filter(t => t.status === 'in_progress'),
    submitted: filtered.filter(t => t.status === 'submitted'),
    approved: filtered.filter(t => t.status === 'approved'),
    rejected: filtered.filter(t => t.status === 'rejected'),
  }

  const activeMembers = members.filter(m => m.status === 'active' && m.user_id)

  if (!currentOrg) return (
    <EmptyState icon="fi fi-br-clipboard-list" title="No workspace" description="Create a workspace first to manage tasks." />
  )

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="section-title text-xl">Tasks</h1>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>{tasks.length} total · {tasks.filter(t => t.status === 'submitted').length} awaiting review</p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> New task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
          {STATUSES.map(s => (
            <button
              key={s}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: filter === s ? 'var(--surface)' : 'transparent',
                color: filter === s ? 'var(--text)' : 'var(--text-2)',
                boxShadow: filter === s ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
              onClick={() => setFilter(s)}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <select
          style={{ width: 'auto', padding: '6px 10px', fontSize: 13 }}
          value={assigneeFilter}
          onChange={e => setAssigneeFilter(e.target.value)}
        >
          <option value="all">All members</option>
          <option value="me">My tasks</option>
          {activeMembers.map(m => (
            <option key={m.user_id} value={m.user_id}>{m.profiles?.full_name || m.email}</option>
          ))}
        </select>
      </div>

      {/* Kanban board */}
      {filter === 'all' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(grouped).map(([status, statusTasks]) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium" style={{ textTransform: 'capitalize' }}>{status.replace('_', ' ')}</span>
                <span className="badge text-xs" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>{statusTasks.length}</span>
              </div>
              <div className="space-y-2">
                {statusTasks.length === 0 ? (
                  <div className="card p-4 text-center">
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>Empty</p>
                  </div>
                ) : statusTasks.map(t => (
                  <TaskCard key={t.id} task={t} onClick={setSelectedTask} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <EmptyState icon="fi fi-br-check-circle" title="No tasks" description="No tasks matching this filter." />
          ) : filtered.map(t => (
            <TaskCard key={t.id} task={t} onClick={setSelectedTask} />
          ))}
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          open
          onClose={() => setSelectedTask(null)}
          onUpdate={() => { fetchTasks(); setSelectedTask(null) }}
        />
      )}

      {createOpen && (
        <CreateTaskModal open onClose={() => setCreateOpen(false)} onCreated={fetchTasks} />
      )}
    </div>
  )
}
