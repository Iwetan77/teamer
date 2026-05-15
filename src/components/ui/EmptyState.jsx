export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="mb-4 flex items-center justify-center w-14 h-14 rounded-2xl" style={{ background: 'var(--surface-2)' }}>
        {typeof icon === 'string' && icon.startsWith('fi ')
          ? <i className={icon} style={{ fontSize: 24, color: 'var(--text-2)' }} />
          : <span style={{ fontSize: 28, opacity: 0.6 }}>{icon}</span>
        }
      </div>
      <h3 className="section-title text-base mb-2">{title}</h3>
      <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-2)' }}>{description}</p>
      {action}
    </div>
  )
}
