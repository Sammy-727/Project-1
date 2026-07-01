import { useEffect, useState } from 'react'
import { reportsApi } from '../services/api'
import StatCard from '../components/StatCard'

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export default function Reports() {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    reportsApi.summary().then((r) => setSummary(r.data))
  }, [])

  if (!summary) return <p>Loading reports...</p>

  const occupancy = summary.totalRooms
    ? Math.round((summary.occupiedRooms / summary.totalRooms) * 100)
    : 0

  return (
    <>
      <div className="hero">
        <div>
          <h2>Reports & Analytics</h2>
          <p>Hotel performance overview</p>
        </div>
        <div className="hero-total">
          <span>Occupancy Rate</span>
          <strong>{occupancy}%</strong>
        </div>
      </div>

      <div className="cards">
        <StatCard icon="💰" label="Total Revenue" value={fmt(summary.revenue)} color="green" />
        <StatCard icon="📅" label="Total Bookings" value={summary.totalBookings} color="purple" />
        <StatCard icon="🛏️" label="Total Rooms" value={summary.totalRooms} color="blue" />
        <StatCard icon="✅" label="Available Rooms" value={summary.availableRooms} color="green" />
        <StatCard icon="🔴" label="Occupied Rooms" value={summary.occupiedRooms} color="red" />
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Room Status Overview</h3>
        </div>
        <div className="status-pills">
          <div className="status-pill">
            <span className="status-dot available" />
            Available: {summary.availableRooms}
          </div>
          <div className="status-pill">
            <span className="status-dot occupied" />
            Occupied: {summary.occupiedRooms}
          </div>
          <div className="status-pill">
            <span className="status-dot reserved" />
            Other: {summary.totalRooms - summary.availableRooms - summary.occupiedRooms}
          </div>
        </div>
      </div>
    </>
  )
}
