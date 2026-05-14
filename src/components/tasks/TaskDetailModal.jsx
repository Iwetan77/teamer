import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { StatusBadge } from '../ui/StatusBadge'
import { Avatar } from '../ui/Avatar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useOrg } from '../../context/OrgContext'
import { submissionTypeForSkill, formatDeadline, PRIORITY_CONFIG } from '../../lib/utils'
import { format } from 'date-fns'
import { Paperclip, MessageSquare, CheckCircle, XCircle, Upload, Send } from 'lucide-react'
import toast from 'react-hot-toast'

export function TaskDetailModal({ task, open, onClose, onUpdate }) {
  const { user, profile } = useAuth()
  const { isAdmin, currentOrg, members } = useOrg()
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [submissionUrl, setSubmissionUrl] = useState(task?.submission_url || '')
  const [submissionNote, setSubmissionNote] = useState(task?.submission_note || '')
  const [reviewerNote, setReviewerNote] = useState(task?.reviewer_note || '')
  const [uploading, setUploading] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(false)

  const isAssignee = task?.assigned_to === user?.id
  const canSubmit = isAssignee && ['assigned', 'in_progress', 'rejected'].includes(task?.status)
  const canReview = isAdmin && task?.status === 'submitted'
  const subType = submissionTypeForSkill(task?.profiles?.skill)

  useEffect(() => {
    if (!open || !task) return
    fetchComments()
    fetchAttachments()
    setSubmissionUrl(task.submission_url || '')
    setSubmissionNote(task.submission_note || '')
    setReviewerNote(task.reviewer_note || '')
  }, [open, task?.id])

  // Realtime comments
  useEffect(() => {
    if (!open || !task) return
    const channel = supabase.channel(`comments:${task.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_comments', filter: `task_id=eq.${task.id}` }, () => {
        fetchComments()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [open, task?.id])

  async function fetchComments() {
    const { data } = await supabase
      .from('task_comments')
      .select('*, profiles(full_name, avatar_url)')
      .eq('task_id', task.id)
      .order('created_at')
    if (data) setComments(data)
  }

  async function fetchAttachments() {
    const { data } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', task.id)
    if (data) setAttachments(data)
  }

  async function handleMarkInProgress() {
    const { error } = await supabase.from('tasks').update({ status: 'in_progress' }).eq('id', task.id)
    if (error) return toast.error('Failed to update')
    toast.success('Marked as in progress')
    onUpdate()
  }

  async function handleSubmit() {
    if (!submissionUrl && !submissionNote && attachments.length === 0) {
      return toast.error('Add a link, note, or file before submitting')
    }
    setLoading(true)
    const { error } = await supabase.from('tasks').update({
      status: 'submitted',
      submission_url: submissionUrl || null,
      submission_note: submissionNote || null,
    }).eq('id', task.id)
    setLoading(false)
    if (error) return toast.error('Failed to submit')

    // Notify the admin who assigned this task
    if (task.assigned_by && task.assigned_by !== user.id) {
      await supabase.from('notifications').insert({
        user_id: task.assigned_by,
        type: 'task_submitted',
        title: 'Task submitted for review',
        body: `"${task.title}" has been submitted by ${profile?.full_name || 'a team member'}.`,
      })
    }

    toast.success('Task submitted for review!')
    onUpdate()
  }

  async function handleApprove() {
    setLoading(true)
    const { error } = await supabase.from('tasks')
      .update({ status: 'approved', reviewer_note: reviewerNote || null })
      .eq('id', task.id)
    setLoading(false)
    if (error) return toast.error('Failed to approve')

    // Notify assignee
    if (task.assigned_to) {
      await supabase.from('notifications').insert({
        user_id: task.assigned_to,
        type: 'task_approved',
        title: 'Task approved!',
        body: `"${task.title}" has been approved${reviewerNote ? `: ${reviewerNote}` : '.'}`,
      })
    }

    toast.success('Task approved!')
    onUpdate()
  }

  async function handleReject() {
    setLoading(true)
    const { error } = await supabase.from('tasks')
      .update({ status: 'rejected', reviewer_note: reviewerNote || null })
      .eq('id', task.id)
    setLoading(false)
    if (error) return toast.error('Failed to reject')

    // Notify assignee
    if (task.assigned_to) {
      await supabase.from('notifications').insert({
        user_id: task.assigned_to,
        type: 'task_rejected',
        title: 'Task needs changes',
        body: `"${task.title}" was sent back for revision${reviewerNote ? `: ${reviewerNote}` : '.'}`,
      })
    }

    toast('Task sent back for revision', { icon: '↩️' })
    onUpdate()
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) return toast.error('File must be under 20MB')
    setUploading(true)
    const path = `tasks/${task.id}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('task-attachments').upload(path, file)
    if (error) { setUploading(false); return toast.error('Upload failed — check your Supabase storage bucket exists') }
    const { data: urlData } = supabase.storage.from('task-attachments').getPublicUrl(path)
    await supabase.from('task_attachments').insert({
      task_id: task.id,
      uploaded_by: user.id,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      storage_path: path,
      public_url: urlData.publicUrl,
    })
    await fetchAttachments()
    setUploading(false)
    toast.success('File uploaded!')
  }

  async function addComment() {
    if (!newComment.trim()) return
    const body = newComment.trim()
    setNewComment('')
    const { error } = await supabase.from('task_comments').insert({
      task_id: task.id,
      author_id: user.id,
      body,
    })
    if (error) { setNewComment(body); return toast.error('Failed to send comment') }

    // Notify the other person in the task (assignee or admin)
    const notifyId = isAssignee ? task.assigned_by : task.assigned_to
    if (notifyId && notifyId !== user.id) {
      await supabase.from('notifications').insert({
        user_id: notifyId,
        type: 'task_comment',
        title: `New comment on "${task.title}"`,
        body: `${profile?.full_name || 'Someone'}: ${body.slice(0, 80)}`,
      })
    }
  }

  if (!task) return null
  const dl = task.deadline ? formatDeadline(task.deadline) : null
  const priority = PRIORITY_CONFIG[task.priority]

  return (
    <Modal open={open} onClose={onClose} title="Task Details" size="lg">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-base font-semibold">{task.title}</h3>
            <StatusBadge status={task.status} />
          </div>
          {task.description && <p className="text-sm" style={{ color: 'var(--text-2)' }}>{task.description}</p>}
          <div className="flex flex-wrap gap-3 mt-3 text-xs" style={{ color: 'var(--text-2)' }}>
            {task.profiles && (
              <div className="flex items-center gap-1.5">
                <Avatar name={task.profiles.full_name} src={task.profiles.avatar_url} size={16} />
                {task.profiles.full_name}
              </div>
            )}
            {priority && <span className={`font-medium ${priority.color}`}>{priority.label} priority</span>}
            {dl && <span className={dl.overdue ? 'text-red-500' : dl.urgent ? 'text-orange-500' : ''}>{dl.text}</span>}
            {task.deadline && <span>Due {format(new Date(task.deadline), 'MMM d, yyyy · h:mm a')}</span>}
          </div>
        </div>

        <hr style={{ borderColor: 'var(--border)' }} />

        {/* Mark in progress */}
        {isAssignee && task.status === 'assigned' && (
          <button className="btn-outline w-full" onClick={handleMarkInProgress}>
            Mark as In Progress
          </button>
        )}

        {/* Rejected feedback */}
        {task.status === 'rejected' && task.reviewer_note && (
          <div className="rounded-lg p-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p className="text-xs font-medium text-red-600 mb-1">Changes requested</p>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>{task.reviewer_note}</p>
          </div>
        )}

        {/* Submission area */}
        {(canSubmit || task.submission_url || task.submission_note || attachments.length > 0) && (
          <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--surface-2)' }}>
            <p className="text-sm font-medium">{subType.icon} {subType.label}</p>

            {(subType.type === 'github' || subType.type === 'mixed') && (
              <input
                value={submissionUrl}
                onChange={e => setSubmissionUrl(e.target.value)}
                placeholder={subType.placeholder}
                disabled={!canSubmit}
                style={{ opacity: canSubmit ? 1 : 0.7 }}
              />
            )}

            {(subType.type === 'file' || subType.type === 'document' || subType.type === 'mixed') && canSubmit && (
              <label className="btn-outline text-xs cursor-pointer inline-flex items-center gap-1.5">
                <Upload size={14} />
                {uploading ? 'Uploading...' : 'Upload file'}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            )}

            {attachments.length > 0 && (
              <div className="space-y-1">
                {attachments.map(a => (
                  <a key={a.id} href={a.public_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--accent)' }}>
                    <Paperclip size={12} /> {a.file_name}
                  </a>
                ))}
              </div>
            )}

            <textarea
              value={submissionNote}
              onChange={e => setSubmissionNote(e.target.value)}
              placeholder="Add a note about your submission..."
              rows={2}
              style={{ resize: 'none', opacity: canSubmit ? 1 : 0.7 }}
              disabled={!canSubmit}
            />

            {canSubmit && (
              <button className="btn-primary w-full" onClick={handleSubmit} disabled={loading}>
                <Send size={14} />
                {loading ? 'Submitting...' : 'Submit for review'}
              </button>
            )}
          </div>
        )}

        {/* Review area */}
        {(canReview || (task.reviewer_note && task.status === 'approved')) && (
          <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-medium">Review</p>
            <textarea
              value={reviewerNote}
              onChange={e => setReviewerNote(e.target.value)}
              placeholder="Add feedback for the assignee..."
              rows={2}
              style={{ resize: 'none', opacity: canReview ? 1 : 0.7 }}
              disabled={!canReview}
            />
            {canReview && (
              <div className="flex gap-2">
                <button className="btn-primary flex-1" onClick={handleApprove} disabled={loading} style={{ background: '#10b981' }}>
                  <CheckCircle size={14} /> Approve
                </button>
                <button className="btn-outline flex-1 text-red-500 border-red-200" onClick={handleReject} disabled={loading}>
                  <XCircle size={14} /> Request changes
                </button>
              </div>
            )}
            {task.reviewer_note && !canReview && task.status === 'approved' && (
              <p className="text-xs italic" style={{ color: 'var(--text-2)' }}>{task.reviewer_note}</p>
            )}
          </div>
        )}

        {/* Comments */}
        <div>
          <p className="text-sm font-medium mb-3 flex items-center gap-1.5">
            <MessageSquare size={14} /> Discussion {comments.length > 0 && `(${comments.length})`}
          </p>
          <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>No comments yet. Start the discussion.</p>
            ) : comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <Avatar name={c.profiles?.full_name} src={c.profiles?.avatar_url} size={24} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{c.profiles?.full_name}</span>
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                      {format(new Date(c.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>{c.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Leave a comment..."
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addComment()}
            />
            <button className="btn-primary px-3" onClick={addComment} disabled={!newComment.trim()}>
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
