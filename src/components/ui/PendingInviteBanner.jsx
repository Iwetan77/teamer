import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useOrg } from '../../context/OrgContext'
import { X, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function PendingInviteBanner() {
  const { pendingInvites, acceptInvite, dismissInvite } = useAuth()
  const { refetch } = useOrg()
  const [accepting, setAccepting] = useState(null)

  if (!pendingInvites.length) return null

  async function handleAccept(invite) {
    setAccepting(invite.invite_token)
    const { error } = await acceptInvite(invite.invite_token)
    setAccepting(null)
    if (error) {
      toast.error('Failed to accept invite. Try again.')
      return
    }
    await refetch(invite.org_id)
    toast.success(`Welcome to ${invite.organizations?.name}!`)
  }

  return (
    <div className="space-y-2 px-4 pt-4 lg:px-6">
      {pendingInvites.map(invite => (
        <div
          key={invite.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', color: 'var(--text)' }}
        >
          <Building2 size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <p className="flex-1">
            You've been invited to join <strong>{invite.organizations?.name}</strong>
          </p>
          <div className="flex items-center gap-2">
            <button
              className="btn-primary py-1 px-3 text-xs"
              onClick={() => handleAccept(invite)}
              disabled={accepting === invite.invite_token}
            >
              {accepting === invite.invite_token ? 'Joining...' : 'Accept'}
            </button>
            <button
              className="btn-ghost p-1"
              onClick={() => dismissInvite(invite.invite_token)}
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
