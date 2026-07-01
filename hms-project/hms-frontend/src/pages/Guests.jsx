import { useEffect, useState } from 'react'
import { guestsApi } from '../services/api'
import Modal from '../components/Modal'

const emptyGuest = { name: '', phone: '', email: '', address: '', idProofType: '', idProofNumber: '' }

export default function Guests() {
  const [guests, setGuests] = useState([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyGuest)
  const [message, setMessage] = useState('')

  const load = () => {
    guestsApi.list(search ? { q: search } : {}).then((r) => setGuests(r.data))
  }

  useEffect(() => { load() }, [search])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyGuest)
    setModal(true)
  }

  const openEdit = (guest) => {
    setEditing(guest)
    setForm({ ...guest })
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      if (editing) await guestsApi.update(editing.id, form)
      else await guestsApi.create(form)
      setModal(false)
      setMessage(editing ? 'Guest updated' : 'Guest created')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Save failed')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this guest?')) return
    await guestsApi.remove(id)
    setMessage('Guest deleted')
    load()
  }

  return (
    <>
      <div className="page-actions">
        <h2>Guests</h2>
        <div className="filter-bar">
          <input placeholder="Search guests..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 200 }} />
          <button type="button" className="btn btn-primary" onClick={openCreate}>+ Add Guest</button>
        </div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>ID Proof</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((g) => (
              <tr key={g.id}>
                <td><strong>{g.name}</strong></td>
                <td>{g.phone}</td>
                <td>{g.email}</td>
                <td>{g.idProofType} — {g.idProofNumber}</td>
                <td>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(g)}>Edit</button>{' '}
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(g.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} title={editing ? 'Edit Guest' : 'Add Guest'} onClose={() => setModal(false)}>
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <input type="email" placeholder="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="ID Proof Type" value={form.idProofType || ''} onChange={(e) => setForm({ ...form, idProofType: e.target.value })} />
            <input placeholder="ID Number" value={form.idProofNumber || ''} onChange={(e) => setForm({ ...form, idProofNumber: e.target.value })} />
          </div>
          <textarea placeholder="Address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">Save</button>
            <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
