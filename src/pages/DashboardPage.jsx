import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { TaskCard } from '../components/tasks/TaskCard'
import { TaskDetailModal } from '../components/tasks/TaskDetailModal'
import { CreateOrgModal } from '../components/org/CreateOrgModal'
import { EmptyState } from '../components/ui/EmptyState'
import { Avatar } from '../components/ui/Avatar'
import { getSkill } from '../lib/utils'
import { format } from 'date-fns'
import { Plus, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const { profile } = useAuth()
  const { currentOrg, members, isAdmin } = useOrg()
  const [tasks, setTasks] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)
  const [createOrgOpen, setCreateOrgOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentOrg) { fetchData() }
    else setLoading(false)
  }, [currentOrg])

  async function fetchData() {
    setLoading(true)
    const [tasksRes, announcementsRes] = await Promise.all([
      supabase.from('tasks').select('*, profiles!tasks_assigned_to_fkey(full_name, avatar_url, skill)').eq('org_id', currentOrg.id).order('created_at', { ascending: false }).limit(6),
      supabase.from('announcements').select('*, profiles(full_name, avatar_url)').eq('org_id', currentOrg.id).order('created_at', { ascending: false }).limit(5),
    ])
    if (tasksRes.data) setTasks(tasksRes.data)
    if (announcementsRes.data) setAnnouncements(announcementsRes.data)
    setLoading(false)
  }

  if (!currentOrg) return (
    <div>
      <EmptyState
        icon="fi fi-br-building"
        title="No workspace yet"
        description="Create your first workspace to invite your team and start assigning tasks."
        action={<button className="btn-primary" onClick={() => setCreateOrgOpen(true)}><Plus size={16} /> Create workspace</button>}
      />
      {createOrgOpen && <CreateOrgModal open onClose={() => setCreateOrgOpen(false)} />}
    </div>
  )

  const myTasks = tasks.filter(t => t.assigned_to === profile?.id)
  const allTasks = tasks
  const stats = {
    total: allTasks.length,
    approved: allTasks.filter(t => t.status === 'approved').length,
    submitted: allTasks.filter(t => t.status === 'submitted').length,
    inProgress: allTasks.filter(t => t.status === 'in_progress').length,
  }

  const activeMembers = members.filter(m => m.status === 'active').slice(0, 8)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="section-title text-2xl">Good {getGreeting()}, {profile?.full_name?.split(' ')[0]}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>{currentOrg.name} · {format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total tasks', value: stats.total, bg: 'var(--surface-2)' },
          { label: 'In progress', value: stats.inProgress, bg: '#eff6ff' },
          { label: 'Submitted', value: stats.submitted, bg: '#f5f3ff' },
          { label: 'Approved', value: stats.approved, bg: '#f0fdf4' },
        ].map((s, i) => (
          <div key={i} className="card p-4" style={{ background: s.bg }}>
            <p className="label mb-1">{s.label}</p>
            <p className="text-2xl font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* My tasks */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="section-title text-sm">My tasks</h2>
            <a href="/tasks" className="text-xs" style={{ color: 'var(--accent)' }}>View all →</a>
          </div>
          {myTasks.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>No tasks assigned to you yet.</p>
            </div>
          ) : myTasks.map(t => (
            <TaskCard key={t.id} task={t} onClick={setSelectedTask} />
          ))}

          {isAdmin && (
            <>
              <div className="flex items-center justify-between pt-2">
                <h2 className="section-title text-sm">Recent team tasks</h2>
              </div>
              {allTasks.filter(t => t.assigned_to !== profile?.id).slice(0, 3).map(t => (
                <TaskCard key={t.id} task={t} onClick={setSelectedTask} />
              ))}
            </>
          )}
        </div>

        {/* Sidebar: Announcements + Team */}
        <div className="space-y-4">
          {/* Announcements */}
          <div className="card p-4">
            <h2 className="section-title text-sm mb-3 flex items-center gap-1.5"><i className="fi fi-br-megaphone" style={{ fontSize: 13 }} /> Announcements</h2>
            {announcements.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>No announcements yet.</p>
            ) : announcements.map(a => (
              <div key={a.id} className="pb-3 mb-3 border-b last:border-0 last:pb-0 last:mb-0" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-2)' }}>{a.body}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Avatar name={a.profiles?.full_name} src={a.profiles?.avatar_url} size={16} />
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>{a.profiles?.full_name?.split(' ')[0]} · {format(new Date(a.created_at), 'MMM d')}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Team */}
          <div className="card p-4">
            <h2 className="section-title text-sm mb-3 flex items-center gap-1.5"><i className="fi fi-br-users" style={{ fontSize: 13 }} /> Team</h2>
            <div className="space-y-2">
              {activeMembers.map(m => {
                const skill = getSkill(m.profiles?.skill)
                return (
                  <div key={m.id} className="flex items-center gap-2">
                    <Avatar name={m.profiles?.full_name || m.email} src={m.profiles?.avatar_url} size={28} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.profiles?.full_name || m.email}</p>
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}><i className={skill.icon} style={{ fontSize: 11 }} /> {skill.label}</p>
                    </div>
                    {m.role !== 'member' && (
                      <span className="badge text-xs" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{m.role}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailModal task={selectedTask} open onClose={() => setSelectedTask(null)} onUpdate={() => { fetchData(); setSelectedTask(null) }} />
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
