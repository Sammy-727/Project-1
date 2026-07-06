import { useApp } from '../../context/AppContext';
import BottomNav from '../../components/BottomNav';
import { EmptyState, PageHeader } from '../../components/UI';
import { Users, MapPin } from 'lucide-react';
import { getBusiness, getJob } from '../../services/storage';

export default function WorkerEmployment() {
  const { acceptedRequests, getWorker } = useApp();

  return (
    <div className="app-page">
      <PageHeader title="Employment" subtitle={`${acceptedRequests.length} active engagements`} />

      <div className="card-list">
        {acceptedRequests.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No active employment"
            message="When your applications are accepted, employment details will show here."
            actionLabel="View Requests"
            actionTo="/worker/requests"
          />
        ) : (
          acceptedRequests.map((req) => {
            const biz = getBusiness(req.businessId);
            const job = getJob(req.jobId);
            return (
              <div key={req.id} className="card employment-card">
                <h3>{job?.title || biz?.businessName}</h3>
                <p className="card-meta">{biz?.businessName} · {biz?.category}</p>
                {job && <p className="card-pay">{job.pay}</p>}
                <p className="card-distance"><MapPin size={14} /> {biz?.location?.locality || biz?.locality}</p>
                <span className="status-badge status-accepted">Active</span>
              </div>
            );
          })
        )}
      </div>
      <BottomNav role="worker" />
    </div>
  );
}
