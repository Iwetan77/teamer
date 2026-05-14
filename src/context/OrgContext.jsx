import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const OrgContext = createContext({})

export function OrgProvider({ children }) {
  const { user } = useAuth()
  const [orgs, setOrgs] = useState([])
  const [currentOrg, setCurrentOrg] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState(null)
  const currentOrgRef = useRef(null)

  useEffect(() => {
    if (user) fetchOrgs()
    else { setOrgs([]); setCurrentOrg(null); setMembers([]); setLoading(false) }
  }, [user])

  // Keep ref in sync so realtime callback always has latest org
  useEffect(() => {
    currentOrgRef.current = currentOrg
    if (currentOrg) {
      fetchMembers(currentOrg.id)
      localStorage.setItem('teamer-last-org', currentOrg.id)
    }
  }, [currentOrg])

  // Global realtime: keep members fresh on every page, not just TeamPage
  useEffect(() => {
    if (!user) return
    const channel = supabase.channel(`org-members-global:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'org_members' }, (payload) => {
        const orgId = payload.new?.org_id || payload.old?.org_id
        if (orgId && orgId === currentOrgRef.current?.id) {
          fetchMembers(orgId)
        }
        // If user's own membership changed (e.g. they were removed), refetch orgs
        if (payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
          fetchOrgs()
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  async function fetchOrgs(selectOrgId = null) {
    setLoading(true)
    const { data } = await supabase
      .from('org_members')
      .select('org_id, role, status, organizations(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (data) {
      const orgsData = data
        .filter(d => d.organizations?.id)
        .map(d => ({ ...d.organizations, myRole: d.role }))
      setOrgs(orgsData)

      // selectOrgId takes priority (e.g. after accepting invite)
      const targetId = selectOrgId || localStorage.getItem('teamer-last-org')
      const target = orgsData.find(o => o.id === targetId)
      const selected = target || orgsData[0] || null
      setCurrentOrg(selected)
      if (selected) {
        const role = data.find(d => d.org_id === selected.id)?.role
        setMyRole(role)
      }
    }
    setLoading(false)
  }

  async function fetchMembers(orgId) {
    const { data, error } = await supabase
      .from('org_members')
      .select('*, profiles(*)')
      .eq('org_id', orgId)
      .neq('status', 'removed')
    if (error) console.error('[fetchMembers] ERROR code:', error.code, 'message:', error.message, 'details:', error.details)
    console.log('[fetchMembers] orgId:', orgId, 'rows:', data?.length)
    if (data) setMembers(data)
    const me = data?.find(m => m.user_id === user?.id)
    if (me) setMyRole(me.role)
  }

  async function createOrg(name, description) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36)
    const { data: org, error } = await supabase
      .from('organizations')
      .insert({ name, slug, description, owner_id: user.id })
      .select()
      .single()
    if (error) return { error }
    await supabase.from('org_members').insert({
      org_id: org.id,
      user_id: user.id,
      email: user.email,
      role: 'owner',
      status: 'active',
      joined_at: new Date().toISOString()
    })
    await fetchOrgs(org.id)
    return { data: org }
  }

  async function inviteMember(email) {
    if (!currentOrg) return { error: 'No org selected' }

    const { data: existingMember } = await supabase
      .from('org_members')
      .select('id, status, invite_token')
      .eq('org_id', currentOrg.id)
      .eq('email', email)
      .single()

    if (existingMember?.status === 'active') {
      return { error: { code: '23505', message: 'This person is already in your workspace.' } }
    }
    if (existingMember?.status === 'invited') {
      return { data: existingMember, userExists: false, resent: true }
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single()

    const { data, error } = await supabase
      .from('org_members')
      .insert({ org_id: currentOrg.id, email, invited_by: user.id, status: 'invited', user_id: existingProfile?.id || null })
      .select()
      .single()
    if (error) return { error }

    if (existingProfile?.id) {
      await supabase.from('notifications').insert({
        user_id: existingProfile.id,
        type: 'workspace_invite',
        title: `You've been invited to ${currentOrg.name}`,
        body: `Accept the invite to join ${currentOrg.name} on Teamer.`,
        link: `/invite?token=${data.invite_token}`,
      })
    }

    await fetchMembers(currentOrg.id)
    return { data, userExists: !!existingProfile }
  }

  async function shareOwnership(memberId) {
    await supabase.from('org_members').update({ role: 'admin' }).eq('id', memberId)
    await fetchMembers(currentOrg.id)
  }

  async function removeMember(memberId) {
    await supabase.from('org_members').update({ status: 'removed' }).eq('id', memberId)
    await fetchMembers(currentOrg.id)
  }

  async function deleteOrg() {
    if (!currentOrg) return { error: 'No org selected' }
    const { error } = await supabase.from('organizations').delete().eq('id', currentOrg.id)
    if (error) return { error }
    setCurrentOrg(null)
    setOrgs([])
    setMembers([])
    localStorage.removeItem('teamer-last-org')
    await fetchOrgs()
    return {}
  }

  const isAdmin = myRole === 'owner' || myRole === 'admin'

  return (
    <OrgContext.Provider value={{
      orgs, currentOrg, setCurrentOrg, members, loading, myRole, isAdmin,
      createOrg, inviteMember, shareOwnership, removeMember, deleteOrg,
      refetch: (selectOrgId) => fetchOrgs(selectOrgId),
      refetchMembers: () => currentOrg && fetchMembers(currentOrg.id),
    }}>
      {children}
    </OrgContext.Provider>
  )
}

export const useOrg = () => useContext(OrgContext)
