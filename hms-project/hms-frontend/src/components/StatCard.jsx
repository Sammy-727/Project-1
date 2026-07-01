export default function StatCard({ icon, label, value, color = 'purple' }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div className="stat-info">
        <span>{label}</span>
        <h3>{value}</h3>
      </div>
    </div>
  )
}
