// FinTrack — EmptyState Component

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon className="empty-state-icon" size={80} strokeWidth={1} />}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && action}
    </div>
  );
}
