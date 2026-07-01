import { useEffect, useState } from 'react'
import { bookingsApi, guestsApi, roomsApi } from '../services/api'
import Badge from '../components/Badge'
import Modal from '../components/Modal'

const today = new Date().toISOString().slice(0, 10)
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

export default function Bookings() {
  const [bookings, setBookings] = useState([])
  const [arrivals, setArrivals] = useState([])
  const [active, setActive] = useState([])
  const [guests, setGuests] = useState([])
  const [rooms, setRooms] = useState([])
  const [tab, setTab] = useState('all')
  const [modal, setModal] = useState(false)
  const [checkoutModal, setCheckoutModal] = useState(null)
  const [form, setForm] = useState({ guestId: '', roomId: '', checkin: today, checkout: tomorrow, numGuests: 1 })
  const [checkoutForm, setCheckoutForm] = useState({ discount: 0, paymentAmount: 0, paymentMode: 'Cash', allowPending: false })
  const [message, setMessage] = useState('')

  const load = () => {
    bookingsApi.list().then((r) => setBookings(r.data))
    bookingsApi.arrivals().then((r) => setArrivals(r.data))
    bookingsApi.active().then((r) => setActive(r.data))
  }

  useEffect(() => {
    load()
    guestsApi.list().then((r) => setGuests(r.data))
    roomsApi.list({ status: 'AVAILABLE' }).then((r) => setRooms(r.data))
  }, [])

  const openCreate = () => {
    setForm({ guestId: guests[0]?.id || '', roomId: rooms[0]?.id || '', checkin: today, checkout: tomorrow, numGuests: 1 })
    setModal(true)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await bookingsApi.create({
        guestId: +form.guestId,
        roomId: +form.roomId,
        checkin: form.checkin,
        checkout: form.checkout,
        numGuests: +form.numGuests,
      })
      setModal(false)
      setMessage('Booking created')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Booking failed')
    }
  }

  const handleCheckIn = async (id) => {
    try {
      await bookingsApi.checkIn(id)
      setMessage('Checked in successfully')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Check-in failed')
    }
  }

  const handleCheckOut = async (e) => {
    e.preventDefault()
    try {
      await bookingsApi.checkOut(checkoutModal.id, {
        discount: +checkoutForm.discount,
        paymentAmount: +checkoutForm.paymentAmount,
        paymentMode: checkoutForm.paymentMode,
        allowPending: checkoutForm.allowPending,
      })
      setCheckoutModal(null)
      setMessage('Checked out successfully')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Check-out failed')
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return
    await bookingsApi.cancel(id)
    setMessage('Booking cancelled')
    load()
  }

  const list = tab === 'arrivals' ? arrivals : tab === 'active' ? active : bookings

  const BookingTable = ({ data }) => (
    <table className="data-table">
      <thead>
        <tr>
          <th>Guest</th>
          <th>Room</th>
          <th>Check-in</th>
          <th>Check-out</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((b) => (
          <tr key={b.id}>
            <td>{b.guest?.name}</td>
            <td>{b.room?.roomNo}</td>
            <td>{b.checkin}</td>
            <td>{b.checkout}</td>
            <td>₹{b.totalAmount?.toLocaleString()}</td>
            <td><Badge status={b.status} /></td>
            <td className="inline-form">
              {b.status === 'RESERVED' && (
                <>
                  <button type="button" className="btn btn-success btn-sm" onClick={() => handleCheckIn(b.id)}>Check In</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => handleCancel(b.id)}>Cancel</button>
                </>
              )}
              {b.status === 'CHECKED_IN' && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setCheckoutModal(b)}>Check Out</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <>
      <div className="page-actions">
        <h2>Bookings</h2>
        <button type="button" className="btn btn-primary" onClick={openCreate}>+ New Booking</button>
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        {['all', 'arrivals', 'active'].map((t) => (
          <button
            key={t}
            type="button"
            className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setTab(t)}
          >
            {t === 'all' ? 'All Bookings' : t === 'arrivals' ? "Today's Arrivals" : 'Checked In'}
          </button>
        ))}
      </div>

      <div className="panel">
        <BookingTable data={list} />
      </div>

      <Modal open={modal} title="New Booking" onClose={() => setModal(false)}>
        <form onSubmit={handleCreate}>
          <div className="form-grid">
            <select value={form.guestId} onChange={(e) => setForm({ ...form, guestId: e.target.value })} required>
              <option value="">Select Guest</option>
              {guests.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} required>
              <option value="">Select Room</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.roomNo} — {r.roomType} (₹{r.price})</option>)}
            </select>
            <input type="date" value={form.checkin} onChange={(e) => setForm({ ...form, checkin: e.target.value })} required />
            <input type="date" value={form.checkout} onChange={(e) => setForm({ ...form, checkout: e.target.value })} required />
            <input type="number" min="1" value={form.numGuests} onChange={(e) => setForm({ ...form, numGuests: e.target.value })} />
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">Create Booking</button>
            <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!checkoutModal} title="Check Out" onClose={() => setCheckoutModal(null)}>
        {checkoutModal && (
          <form onSubmit={handleCheckOut}>
            <p>Guest: <strong>{checkoutModal.guest?.name}</strong> — Room {checkoutModal.room?.roomNo}</p>
            <div className="form-grid">
              <input type="number" placeholder="Discount" value={checkoutForm.discount} onChange={(e) => setCheckoutForm({ ...checkoutForm, discount: e.target.value })} />
              <input type="number" placeholder="Payment Amount" value={checkoutForm.paymentAmount} onChange={(e) => setCheckoutForm({ ...checkoutForm, paymentAmount: e.target.value })} />
              <select value={checkoutForm.paymentMode} onChange={(e) => setCheckoutForm({ ...checkoutForm, paymentMode: e.target.value })}>
                <option>Cash</option>
                <option>Card</option>
                <option>UPI</option>
                <option>Bank Transfer</option>
              </select>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
              <input type="checkbox" checked={checkoutForm.allowPending} onChange={(e) => setCheckoutForm({ ...checkoutForm, allowPending: e.target.checked })} />
              Allow pending balance
            </label>
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary">Complete Check-out</button>
              <button type="button" className="btn btn-secondary" onClick={() => setCheckoutModal(null)}>Cancel</button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
