import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { Modal } from '../components/ui/Modal'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { Plus, Pin, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, formatDistanceToNow } from 'date-fns'

export default function AnnouncementsPage() {
  const { user, profile } = useAuth()
  const { currentOrg, isAdmin, members } = useOrg()
  const [announcements, setAnnouncements] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentOrg) return
    fetchAnnouncements()
    const channel = supabase.channel(`announcements:${currentOrg.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements', filter: `org_id=eq.${currentOrg.id}` }, () => {
        fetchAnnouncements()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [currentOrg])

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from('announcements')
      .select('*, profiles(full_name, avatar_url)')
      .eq('org_id', currentOrg.id)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setAnnouncements(data)
  }

  async function handleCreate() {
    if (!title.trim() || !body.trim()) return toast.error('Title and message required')
    setLoading(true)
    const { error } = await supabase.from('announcements').insert({
      org_id: currentOrg.id,
      author_id: user.id,
      title: title.trim(),
      body: body.trim(),
      pinned,
    })
    setLoading(false)
    if (error) return toast.error('Failed to post')

    // Notify all active members except the poster
    const targets = members.filter(m => m.status === 'active' && m.user_id && m.user_id !== user.id)
    if (targets.length > 0) {
      await supabase.from('notifications').insert(
        targets.map(m => ({
          user_id: m.user_id,
          type: 'announcement',
          title: `📢 ${title.trim()}`,
          body: body.trim().slice(0, 120),
        }))
      )
    }

    toast.success('Announcement posted!')
    setTitle(''); setBody(''); setPinned(false)
    setCreateOpen(false)
    fetchAnnouncements()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return
    await supabase.from('announcements').delete().eq('id', id)
    fetchAnnouncements()
    toast.success('Deleted')
  }

  if (!currentOrg) return <EmptyState icon="fi fi-br-megaphone" title="No workspace" description="Create a workspace first." />

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title text-xl">Announcements</h1>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>Team-wide updates and news</p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Post
          </button>
        )}
      </div>

      {announcements.length === 0 ? (
        <EmptyState
          icon="fi fi-br-megaphone"
          title="No announcements yet"
          description="Post updates, news, or reminders to your whole team here."
          action={isAdmin ? <button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> Make first announcement</button> : null}
        />
      ) : announcements.map(a => (
        <div key={a.id} className="card p-5 animate-slide-up">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {a.pinned && <span className="badge text-xs" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}><Pin size={10} /> Pinned</span>}
                <h3 className="font-semibold text-base">{a.title}</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{a.body}</p>
              <div className="flex items-center gap-2 mt-3">
                <Avatar name={a.profiles?.full_name} src={a.profiles?.avatar_url} size={20} />
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {a.profiles?.full_name} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            {isAdmin && (
              <button className="btn-ghost p-1" onClick={() => handleDelete(a.id)} style={{ color: '#ef4444' }}>
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      ))}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Post announcement">
        <div className="space-y-4">
          <div>
            <label className="label block mb-1.5">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What's the news?" />
          </div>
          <div>
            <label className="label block mb-1.5">Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your announcement..." rows={5} style={{ resize: 'none' }} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} style={{ width: 'auto', padding: 0 }} />
            Pin this announcement
          </label>
          <div className="flex gap-2 justify-end">
            <button className="btn-outline" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? 'Posting...' : 'Post announcement'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
