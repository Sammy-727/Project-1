import { Link } from 'react-router-dom';

export default function Badge({ type, children }) {
  const cls = `badge badge-${type}`;
  return <span className={cls}>{children}</span>;
}

export function TrustBadges({ verified, availability, urgent, nearby }) {
  return (
    <div className="trust-badges">
      {verified && <Badge type="verified">Verified</Badge>}
      {availability === 'available' && <Badge type="available">Available</Badge>}
      {urgent && <Badge type="urgent">Urgent</Badge>}
      {nearby && <Badge type="nearby">Nearby</Badge>}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = { pending: 'pending', accepted: 'accepted', rejected: 'rejected' };
  return <Badge type={map[status] || 'default'}>{status}</Badge>;
}

export function EmptyState({ icon: Icon, title, message, actionLabel, actionTo }) {
  return (
    <div className="empty-state">
      {Icon && <div className="empty-icon"><Icon size={48} strokeWidth={1.2} /></div>}
      <h3>{title}</h3>
      <p>{message}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn btn-primary">{actionLabel}</Link>
      )}
    </div>
  );
}

export function SkeletonCard() {
  return <div className="skeleton-card"><div className="skeleton-line" /><div className="skeleton-line short" /><div className="skeleton-line medium" /></div>;
}

export function PageHeader({ title, subtitle, backTo }) {
  return (
    <header className="page-header">
      {backTo && <Link to={backTo} className="back-btn">←</Link>}
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
    </header>
  );
}

export function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="search-bar">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Search...'}
      />
    </div>
  );
}

export function FilterChips({ options, value, onChange }) {
  return (
    <div className="filter-chips">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`chip ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function FormField({ label, error, children }) {
  return (
    <div className={`form-field ${error ? 'has-error' : ''}`}>
      {label && <label>{label}</label>}
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle-field">
      <span>{label}</span>
      <div className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
        <div className="toggle-thumb" />
      </div>
    </label>
  );
}

export function Avatar({ name, size = 48 }) {
  const initial = (name || '?')[0].toUpperCase();
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initial}
    </div>
  );
}
