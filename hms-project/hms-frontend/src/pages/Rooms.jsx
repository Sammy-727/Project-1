import { useEffect, useState } from 'react'
import { roomsApi } from '../services/api'
import Badge from '../components/Badge'
import Modal from '../components/Modal'

const emptyRoom = { roomNo: '', roomType: 'Standard', floor: 1, price: 1500, capacity: 2, status: 'AVAILABLE', amenities: '' }

export default function Rooms() {
  const [rooms, setRooms] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyRoom)
  const [message, setMessage] = useState('')

  const load = () => {
    const params = {}
    if (search) params.q = search
    if (statusFilter) params.status = statusFilter
    roomsApi.list(params).then((r) => setRooms(r.data))
  }

  useEffect(() => { load() }, [search, statusFilter])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyRoom)
    setModal(true)
  }

  const openEdit = (room) => {
    setEditing(room)
    setForm({ ...room })
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      if (editing) await roomsApi.update(editing.id, form)
      else await roomsApi.create(form)
      setModal(false)
      setMessage(editing ? 'Room updated' : 'Room created')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Save failed')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this room?')) return
    await roomsApi.remove(id)
    setMessage('Room deleted')
    load()
  }

  return (
    <>
      <div className="page-actions">
        <h2>Rooms</h2>
        <div className="filter-bar">
          <input placeholder="Search room..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 180 }} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 140 }}>
            <option value="">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="RESERVED">Reserved</option>
            <option value="CLEANING">Cleaning</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
          <button type="button" className="btn btn-primary" onClick={openCreate}>+ Add Room</button>
        </div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Room No</th>
              <th>Type</th>
              <th>Floor</th>
              <th>Price</th>
              <th>Capacity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.roomNo}</strong></td>
                <td>{r.roomType}</td>
                <td>{r.floor}</td>
                <td>₹{r.price?.toLocaleString()}</td>
                <td>{r.capacity}</td>
                <td><Badge status={r.status} /></td>
                <td>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>Edit</button>{' '}
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} title={editing ? 'Edit Room' : 'Add Room'} onClose={() => setModal(false)}>
        <form onSubmit={handleSave}>
          <div className="form-grid">
            <input placeholder="Room No" value={form.roomNo} onChange={(e) => setForm({ ...form, roomNo: e.target.value })} required />
            <select value={form.roomType} onChange={(e) => setForm({ ...form, roomType: e.target.value })}>
              <option>Standard</option>
              <option>Deluxe</option>
              <option>Super Deluxe</option>
              <option>Suite</option>
            </select>
            <input type="number" placeholder="Floor" value={form.floor} onChange={(e) => setForm({ ...form, floor: +e.target.value })} />
            <input type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} required />
            <input type="number" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="RESERVED">Reserved</option>
              <option value="CLEANING">Cleaning</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
          <input placeholder="Amenities" value={form.amenities || ''} onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">Save</button>
            <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
