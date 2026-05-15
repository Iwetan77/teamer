export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export const SKILLS = [
  { value: 'developer', label: 'Developer', icon: 'fi fi-br-laptop', color: '#6470f1' },
  { value: 'designer', label: 'Designer', icon: 'fi fi-br-paint-brush', color: '#f97316' },
  { value: 'marketer', label: 'Marketer', icon: 'fi fi-br-megaphone', color: '#10b981' },
  { value: 'researcher', label: 'Researcher', icon: 'fi fi-br-flask', color: '#8b5cf6' },
  { value: 'product_manager', label: 'Product Manager', icon: 'fi fi-br-chart-histogram', color: '#f59e0b' },
  { value: 'data_analyst', label: 'Data Analyst', icon: 'fi fi-br-chart-line-up', color: '#06b6d4' },
  { value: 'writer', label: 'Writer', icon: 'fi fi-br-pen-nib', color: '#ec4899' },
  { value: 'other', label: 'Other', icon: 'fi fi-br-star', color: '#6b7280' },
]

export const STATUS_CONFIG = {
  assigned: { label: 'Assigned', icon: '○', color: 'status-assigned' },
  in_progress: { label: 'In Progress', icon: '◑', color: 'status-in_progress' },
  submitted: { label: 'Submitted', icon: '●', color: 'status-submitted' },
  approved: { label: 'Approved', icon: '✓', color: 'status-approved' },
  rejected: { label: 'Rejected', icon: '✕', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
}

export const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-slate-500' },
  medium: { label: 'Medium', color: 'text-blue-500' },
  high: { label: 'High', color: 'text-orange-500' },
  urgent: { label: 'Urgent', color: 'text-red-500' },
}

export function getSkill(value) {
  return SKILLS.find(s => s.value === value) || SKILLS[SKILLS.length - 1]
}

export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export function formatDeadline(date) {
  if (!date) return null
  const d = new Date(date)
  const now = new Date()
  const diff = d - now
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, overdue: true }
  if (days === 0) return { text: 'Due today', urgent: true }
  if (days === 1) return { text: 'Due tomorrow', urgent: true }
  if (days <= 3) return { text: `${days}d left`, urgent: true }
  return { text: `${days}d left`, overdue: false, urgent: false }
}

export function getWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return { week: Math.ceil((((d - yearStart) / 86400000) + 1) / 7), year: d.getUTCFullYear() }
}

export function submissionTypeForSkill(skill) {
  const types = {
    developer: { type: 'github', label: 'GitHub / PR Link', placeholder: 'https://github.com/your-repo/pull/123', icon: 'fi fi-br-link' },
    designer: { type: 'file', label: 'Design Files', placeholder: 'Upload Figma export, PNG, PDF...', icon: 'fi fi-br-paperclip' },
    researcher: { type: 'document', label: 'Research Document', placeholder: 'Upload PDF or doc file', icon: 'fi fi-br-file' },
    marketer: { type: 'mixed', label: 'Campaign Report / Link', placeholder: 'https://... or upload a file', icon: 'fi fi-br-chart-histogram' },
    writer: { type: 'mixed', label: 'Article / Document', placeholder: 'Paste link or upload document', icon: 'fi fi-br-pen-nib' },
    product_manager: { type: 'mixed', label: 'PRD / Spec Link', placeholder: 'Notion, Confluence, or upload doc', icon: 'fi fi-br-clipboard-list' },
    data_analyst: { type: 'mixed', label: 'Dashboard / Report', placeholder: 'Upload report or share dashboard link', icon: 'fi fi-br-chart-line-up' },
    other: { type: 'mixed', label: 'Submission', placeholder: 'Add a link or upload a file', icon: 'fi fi-br-paperclip' },
  }
  return types[skill] || types.other
}
