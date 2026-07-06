import { Link } from 'react-router-dom';
import { Users, FileText, Briefcase } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import BottomNav from '../../components/BottomNav';
import { WorkerCard } from '../../components/Cards';
import { PageHeader } from '../../components/UI';

export default function EmployerDashboard() {
  const { profile, matchedWorkers, pendingRequests, acceptedRequests } = useApp();

  return (
    <div className="app-page">
      <PageHeader
        title={profile?.businessName || 'Dashboard'}
        subtitle={profile?.needWorker ? 'Actively Hiring' : 'Not hiring'}
      />

      <div className="dashboard-stats">
        <div className="stat-card">
          <Users size={20} />
          <strong>{matchedWorkers.length}</strong>
          <span>Nearby Workers</span>
        </div>
        <div className="stat-card">
          <FileText size={20} />
          <strong>{pendingRequests.length}</strong>
          <span>Pending Requests</span>
        </div>
        <div className="stat-card">
          <Briefcase size={20} />
          <strong>{profile?.totalHires || 0}</strong>
          <span>Total Hires</span>
        </div>
      </div>

      <div className="section-header">
        <h3>Top Matches</h3>
        <Link to="/employer/workers">View all</Link>
      </div>

      <div className="card-list horizontal-scroll">
        {matchedWorkers.slice(0, 5).map((w) => (
          <WorkerCard key={w.id} worker={w} linkTo={`/employer/workers/${w.id}`} />
        ))}
        {matchedWorkers.length === 0 && (
          <p className="empty-inline">No matching workers within 12 km. Try updating your category.</p>
        )}
      </div>

      <div className="section-header">
        <h3>Recent Requests</h3>
        <Link to="/employer/requests">View all</Link>
      </div>

      <div className="quick-info">
        <p>{pendingRequests.length} pending · {acceptedRequests.length} accepted</p>
      </div>

      <BottomNav role="employer" />
    </div>
  );
}
