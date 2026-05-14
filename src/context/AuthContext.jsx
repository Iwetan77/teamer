import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingInvites, setPendingInvites] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) fetchProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setPendingInvites([]); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setProfile(data)
      checkPendingInvites(data.email)
      return
    }

    const { data: { user: authUser } } = await supabase.auth.getUser()
    const meta = authUser?.user_metadata ?? {}
    const { data: created } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: authUser.email,
        full_name: meta.full_name || meta.name || authUser.email,
        avatar_url: meta.avatar_url || meta.picture || null,
      })
      .select()
      .single()
    setProfile(created)
    if (created?.email) checkPendingInvites(created.email)
  }

  async function checkPendingInvites(email) {
    const { data } = await supabase
      .from('org_members')
      .select('id, invite_token, org_id, organizations(name)')
      .eq('email', email)
      .eq('status', 'invited')
    setPendingInvites(data || [])
  }

  async function acceptInvite(token) {
    const { data, error } = await supabase.rpc('accept_invitation', { p_token: token })
    if (!error && !data?.error) {
      setPendingInvites(prev => prev.filter(i => i.invite_token !== token))
      return { data }
    }
    return { error: error || data?.error }
  }

  async function declineInvite(token) {
    await supabase.from('org_members').update({ status: 'removed' }).eq('invite_token', token)
    await supabase.from('notifications').update({ read: true })
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .eq('type', 'workspace_invite')
      .like('link', `%${token}%`)
    setPendingInvites(prev => prev.filter(i => i.invite_token !== token))
  }

  function dismissInvite(token) {
    setPendingInvites(prev => prev.filter(i => i.invite_token !== token))
  }

  async function signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' }
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setPendingInvites([])
  }

  async function updateProfile(updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (!error) setProfile(data)
    return { data, error }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, pendingInvites, signInWithGoogle, signOut, updateProfile, acceptInvite, declineInvite, dismissInvite, refetchProfile: () => fetchProfile(user?.id) }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
