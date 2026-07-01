const LABELS = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  RESERVED: 'Reserved',
  CLEANING: 'Cleaning',
  MAINTENANCE: 'Maintenance',
  CHECKED_IN: 'Checked In',
  CHECKED_OUT: 'Checked Out',
  CANCELLED: 'Cancelled',
  PAID: 'Paid',
  PARTIAL: 'Partial',
  PENDING: 'Pending',
}

const CSS_MAP = {
  CHECKED_IN: 'Checked-in',
  CHECKED_OUT: 'Checked-out',
}

export default function Badge({ status }) {
  const label = LABELS[status] || status
  const cls = CSS_MAP[status] || status
  return <span className={`badge badge-${cls}`}>{label}</span>
}
