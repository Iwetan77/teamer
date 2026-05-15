import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function InvitePage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setError('Invalid invite link.'); return }
    // Check token validity
    supabase.from('org_members').select('*, organizations(name)').eq('invite_token', token).single()
      .then(({ data, error }) => {
        if (error || !data) { setStatus('error'); setError('This invite link is invalid or expired.') }
        else if (data.status === 'active') { setStatus('already_active'); setOrgName(data.organizations?.name) }
        else { setStatus('ready'); setOrgName(data.organizations?.name) }
      })
  }, [token])

  async function acceptInvite() {
    if (!user) {
      sessionStorage.setItem('pending_invite_token', token)
      return signInWithGoogle()
    }
    setStatus('accepting')
    const { data, error } = await supabase.rpc('accept_invitation', { p_token: token })
    if (error || data?.error) {
      setStatus('error')
      setError(data?.error || 'Failed to accept invite.')
    } else {
      setStatus('success')
      setTimeout(() => navigate('/dashboard'), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="card p-8 w-full max-w-sm text-center">
        <div className="w-10 h-10 rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-bold" style={{ background: 'var(--accent)' }}>T</div>

        {status === 'loading' && <p style={{ color: 'var(--text-2)' }}>Checking invite...</p>}

        {status === 'ready' && (
          <>
            <h1 className="section-title text-lg mb-2">You're invited!</h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
              You've been invited to join <strong>{orgName}</strong> on Teamer.
            </p>
            <button className="btn-primary w-full" onClick={acceptInvite}>
              {user ? `Accept & join ${orgName}` : 'Sign in to accept invite'}
            </button>
          </>
        )}

        {status === 'accepting' && <p style={{ color: 'var(--text-2)' }}>Joining workspace...</p>}

        {status === 'success' && (
          <>
            <div className="mb-3 flex items-center justify-center w-12 h-12 rounded-2xl mx-auto" style={{ background: '#f0fdf4' }}>
              <i className="fi fi-br-check-circle" style={{ fontSize: 24, color: '#22c55e' }} />
            </div>
            <h1 className="section-title text-lg mb-2">Welcome to {orgName}!</h1>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>Redirecting to your workspace...</p>
          </>
        )}

        {status === 'already_active' && (
          <>
            <h1 className="section-title text-lg mb-2">Already a member</h1>
            <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>You're already in {orgName}.</p>
            <button className="btn-primary w-full" onClick={() => navigate('/dashboard')}>Go to workspace</button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-3 flex items-center justify-center w-12 h-12 rounded-2xl mx-auto" style={{ background: '#fef2f2' }}>
              <i className="fi fi-br-cross-circle" style={{ fontSize: 24, color: '#ef4444' }} />
            </div>
            <h1 className="section-title text-lg mb-2">Invite error</h1>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>{error}</p>
          </>
        )}
      </div>
    </div>
  )
}
