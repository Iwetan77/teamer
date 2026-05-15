import { useState } from 'react'
import { useOrg } from '../context/OrgContext'
import { useAuth } from '../context/AuthContext'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState } from '../components/ui/EmptyState'
import { getSkill, SKILLS } from '../lib/utils'
import { UserPlus, Shield, Trash2, Clock, Copy, Check, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export default function TeamPage() {
  const { currentOrg, members, isAdmin, inviteMember, shareOwnership, removeMember, revokeInvite, updateMemberSkill, myRole } = useOrg()
  const { user } = useAuth()
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [editingSkillId, setEditingSkillId] = useState(null)

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) return toast.error('Invalid email address')
    setLoading(true)
    const { data, error, userExists, resent } = await inviteMember(inviteEmail.trim().toLowerCase())
    setLoading(false)
    if (error) {
      if (error.code === '23505') return toast.error('This person is already an active member.')
      return toast.error(error.message || 'Failed to create invite')
    }
    const inviteLink = `${window.location.origin}/invite?token=${data.invite_token}`
    await copyToClipboard(inviteLink)
    if (resent) {
      toast(`${inviteEmail} was already invited — link re-copied!`, { icon: '🔗', duration: 6000 })
    } else if (userExists) {
      toast.success(`Invite sent! ${inviteEmail} will see it in their notifications.`)
    } else {
      toast(`${inviteEmail} isn't on Teamer yet — link copied! Send it to them to sign up and join.`, { icon: '🔗', duration: 8000 })
    }
    setInviteEmail('')
  }

  async function copyToClipboard(text, id) {
    try {
      await navigator.clipboard.writeText(text)
      if (id) { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000) }
      return true
    } catch {
      toast.error('Could not copy — try manually.')
      return false
    }
  }

  function getInviteLink(token) {
    return `${window.location.origin}/invite?token=${token}`
  }

  async function handleShareOwnership(memberId) {
    if (!confirm('Give this person admin access? They will be able to assign tasks.')) return
    await shareOwnership(memberId)
    toast.success('Admin access granted')
  }

  async function handleRemove(memberId) {
    if (!confirm('Remove this person from the workspace?')) return
    await removeMember(memberId)
    toast.success('Member removed')
  }

  async function handleRevoke(memberId) {
    if (!confirm('Revoke this invite?')) return
    await revokeInvite(memberId)
    toast.success('Invite revoked')
  }

  async function handleSkillChange(m, skill) {
    setEditingSkillId(null)
    await updateMemberSkill(m.user_id, skill)
    toast.success('Role updated')
  }

  if (!currentOrg) return <EmptyState icon="fi fi-br-users" title="No workspace" description="Create a workspace to manage your team." />

  const active = members.filter(m => m.status === 'active')
  const invited = members.filter(m => m.status === 'invited')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="section-title text-xl">Team</h1>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>{active.length} active member{active.length !== 1 ? 's' : ''} · {invited.length} pending invite{invited.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Invite */}
      {isAdmin && (
        <div className="card p-5">
          <h2 className="section-title text-sm mb-3">Invite someone</h2>
          <div className="flex gap-2">
            <input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="Enter email address..."
              type="email"
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              style={{ flex: 1 }}
            />
            <button className="btn-primary" onClick={handleInvite} disabled={loading || !inviteEmail.trim()}>
              <UserPlus size={15} />
              {loading ? 'Inviting...' : 'Invite'}
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
            If they're already on Teamer they'll get a notification. If not, an invite link is copied — send it to them.
          </p>
        </div>
      )}

      {/* Active members */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="section-title text-sm">Active members</h2>
        </div>
        {active.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>No active members yet.</p>
          </div>
        ) : (
          <div>
            {active.map(m => {
              const skill = getSkill(m.profiles?.skill)
              const isMe = m.user_id === user?.id
              return (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <Avatar name={m.profiles?.full_name || m.email} src={m.profiles?.avatar_url} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{m.profiles?.full_name || m.email}</p>
                      {isMe && <span className="badge text-xs" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>You</span>}
                      {m.role !== 'member' && (
                        <span className="badge text-xs flex items-center gap-1" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                          <i className={m.role === 'owner' ? 'fi fi-br-crown' : 'fi fi-br-shield'} style={{ fontSize: 10 }} />
                          {m.role}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {/* Inline role editor for admins */}
                      {isAdmin && !isMe && editingSkillId === m.id ? (
                        <select
                          autoFocus
                          defaultValue={m.profiles?.skill || 'other'}
                          onChange={e => handleSkillChange(m, e.target.value)}
                          onBlur={() => setEditingSkillId(null)}
                          style={{ padding: '1px 4px', fontSize: 11, height: 'auto', width: 'auto' }}
                        >
                          {SKILLS.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
                        </select>
                      ) : (
                        <button
                          className="text-xs flex items-center gap-1"
                          style={{ color: 'var(--text-3)', background: 'none', border: 'none', padding: 0, cursor: isAdmin && !isMe ? 'pointer' : 'default' }}
                          onClick={() => isAdmin && !isMe && setEditingSkillId(m.id)}
                          title={isAdmin && !isMe ? 'Click to change role' : undefined}
                        >
                          <i className={skill.icon} style={{ fontSize: 11 }} /> {skill.label}
                          {isAdmin && !isMe && <ChevronDown size={10} />}
                        </button>
                      )}
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{m.email}</span>
                    </div>
                  </div>
                  {isAdmin && !isMe && (
                    <div className="flex items-center gap-1">
                      {m.role === 'member' && myRole === 'owner' && (
                        <button className="btn-ghost p-1.5" title="Make admin (can assign tasks)" onClick={() => handleShareOwnership(m.id)}>
                          <Shield size={15} />
                        </button>
                      )}
                      <button className="btn-ghost p-1.5" title="Remove member" onClick={() => handleRemove(m.id)} style={{ color: '#ef4444' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {invited.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="section-title text-sm">Pending invites</h2>
          </div>
          {invited.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                <UserPlus size={16} style={{ color: 'var(--text-3)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{m.email}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Invited {format(new Date(m.created_at), 'MMM d, yyyy')}
                  {!m.user_id && <span className="ml-1" style={{ color: '#f59e0b' }}>· not on Teamer yet</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                  <Clock size={10} /> Pending
                </span>
                {isAdmin && m.invite_token && (
                  <button
                    className="btn-ghost p-1.5"
                    title="Copy invite link"
                    onClick={() => {
                      copyToClipboard(getInviteLink(m.invite_token), m.id)
                      toast.success('Invite link copied!')
                    }}
                  >
                    {copiedId === m.id ? <Check size={15} style={{ color: '#22c55e' }} /> : <Copy size={15} />}
                  </button>
                )}
                {isAdmin && (
                  <button
                    className="btn-ghost p-1.5"
                    title="Revoke invite"
                    onClick={() => handleRevoke(m.id)}
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
