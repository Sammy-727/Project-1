import { useEffect, useState } from 'react'
import { paymentsApi, bookingsApi } from '../services/api'
import Modal from '../components/Modal'

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export default function Billing() {
  const [payments, setPayments] = useState([])
  const [revenue, setRevenue] = useState(0)
  const [bookings, setBookings] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ bookingId: '', amount: '', paymentMode: 'Cash', notes: '' })
  const [message, setMessage] = useState('')

  const load = () => {
    paymentsApi.list().then((r) => setPayments(r.data))
    paymentsApi.revenue().then((r) => setRevenue(r.data.total))
    bookingsApi.active().then((r) => setBookings(r.data))
  }

  useEffect(() => { load() }, [])

  const handlePayment = async (e) => {
    e.preventDefault()
    try {
      await paymentsApi.create({
        bookingId: +form.bookingId,
        amount: +form.amount,
        paymentMode: form.paymentMode,
        notes: form.notes,
      })
      setModal(false)
      setMessage('Payment recorded')
      load()
    } catch (err) {
      setMessage(err.response?.data?.message || 'Payment failed')
    }
  }

  return (
    <>
      <div className="page-actions">
        <div>
          <h2>Billing & Payments</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Total revenue: <strong>{fmt(revenue)}</strong></p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModal(true)}>+ Record Payment</button>
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      <div className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Receipt</th>
              <th>Booking</th>
              <th>Guest</th>
              <th>Amount</th>
              <th>Mode</th>
              <th>Date</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.receiptNumber}</strong></td>
                <td>#{p.booking?.id}</td>
                <td>{p.booking?.guest?.name}</td>
                <td>{fmt(p.amount)}</td>
                <td>{p.paymentMode}</td>
                <td>{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '—'}</td>
                <td>{p.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} title="Record Payment" onClose={() => setModal(false)}>
        <form onSubmit={handlePayment}>
          <div className="form-grid">
            <select value={form.bookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })} required>
              <option value="">Select Active Booking</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  #{b.id} — {b.guest?.name} (Room {b.room?.roomNo})
                </option>
              ))}
            </select>
            <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <select value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
              <option>Cash</option>
              <option>Card</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
            </select>
          </div>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">Save Payment</button>
            <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
