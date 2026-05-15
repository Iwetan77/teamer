import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrg } from '../context/OrgContext'
import { supabase } from '../lib/supabase'
import { EmptyState } from '../components/ui/EmptyState'
import { Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { currentOrg, isAdmin, myRole, refetch, deleteOrg } = useOrg()
  const navigate = useNavigate()
  const [name, setName] = useState(currentOrg?.name || '')
  const [description, setDescription] = useState(currentOrg?.description || '')
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  if (!currentOrg || !isAdmin) return (
    <EmptyState icon="fi fi-br-settings" title="No access" description="You need admin access to view settings." />
  )

  async function handleSave() {
    if (!name.trim()) return toast.error('Workspace name is required')
    setLoading(true)
    const { error } = await supabase.from('organizations').update({ name: name.trim(), description: description.trim() }).eq('id', currentOrg.id)
    setLoading(false)
    if (error) return toast.error('Failed to save')
    await refetch()
    toast.success('Settings saved!')
  }

  async function handleDelete() {
    if (deleteConfirm !== currentOrg.name) return toast.error('Workspace name does not match')
    setDeleting(true)
    const { error } = await deleteOrg()
    setDeleting(false)
    if (error) return toast.error('Failed to delete workspace')
    toast.success('Workspace deleted')
    navigate('/dashboard')
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="section-title text-xl">Workspace Settings</h1>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>{currentOrg.name}</p>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label block mb-1.5">Workspace name</label>
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="label block mb-1.5">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: 'none' }} />
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={loading}>
          <Save size={15} />
          {loading ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      {myRole === 'owner' && (
        <div className="card p-5 space-y-3" style={{ borderColor: '#fca5a5' }}>
          <h2 className="section-title text-sm text-red-600">Danger zone</h2>
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>
            Deleting <strong>{currentOrg.name}</strong> will permanently remove all tasks, announcements, and member data. This cannot be undone.
          </p>
          <div>
            <label className="label block mb-1.5">Type <strong>{currentOrg.name}</strong> to confirm</label>
            <input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={currentOrg.name}
              style={{ borderColor: deleteConfirm && deleteConfirm !== currentOrg.name ? '#f87171' : undefined }}
            />
          </div>
          <button
            className="btn-outline flex items-center gap-2"
            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
            onClick={handleDelete}
            disabled={deleting || deleteConfirm !== currentOrg.name}
          >
            <Trash2 size={15} />
            {deleting ? 'Deleting...' : 'Delete workspace'}
          </button>
        </div>
      )}
    </div>
  )
}
