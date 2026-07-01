export default function Modal({ open, title, onClose, children }) {
  if (!open) return null
  return (
    <div className="modal show">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content">
        <button type="button" className="modal-close" onClick={onClose}>✕</button>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}
