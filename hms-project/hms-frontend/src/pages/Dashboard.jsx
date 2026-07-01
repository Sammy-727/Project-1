import { useEffect, useState } from 'react'
import { dashboardApi } from '../services/api'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [bookings, setBookings] = useState([])
  const [payments, setPayments] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      dashboardApi.stats(),
      dashboardApi.recentBookings(),
      dashboardApi.recentPayments(),
    ])
      .then(([s, b, p]) => {
        setStats(s.data)
        setBookings(b.data)
        setPayments(p.data)
      })
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="alert alert-danger">{error}</div>
  if (!stats) return <p>Loading dashboard...</p>

  return (
    <>
      <div className="hero">
        <div>
          <h2>Welcome back!</h2>
          <p>Here's what's happening at GrandStay today.</p>
        </div>
        <div className="hero-total">
          <span>Total Revenue</span>
          <strong>{fmt(stats.revenue)}</strong>
        </div>
      </div>

      <div className="cards">
        <StatCard icon="🛏️" label="Total Rooms" value={stats.totalRooms} color="blue" />
        <StatCard icon="✅" label="Available" value={stats.available} color="green" />
        <StatCard icon="🔴" label="Occupied" value={stats.occupied} color="red" />
        <StatCard icon="📅" label="Active Bookings" value={stats.activeBookings} color="purple" />
        <StatCard icon="👥" label="Active Staff" value={stats.staff} color="orange" />
        <StatCard icon="🧹" label="Cleaning" value={stats.cleaning} color="pink" />
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h3>Recent Bookings</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Room</th>
                <th>Check-in</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.guest?.name}</td>
                  <td>{b.room?.roomNo}</td>
                  <td>{b.checkin}</td>
                  <td><Badge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Recent Payments</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Amount</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.receiptNumber}</td>
                  <td>{fmt(p.amount)}</td>
                  <td>{p.paymentMode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
