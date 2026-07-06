import { useApp } from '../../context/AppContext';
import BottomNav from '../../components/BottomNav';
import { RequestCard } from '../../components/Cards';
import { EmptyState, PageHeader } from '../../components/UI';
import { FileText } from 'lucide-react';

export default function WorkerRequests() {
  const { userRequests, getWorker, getBusiness, jobs, respondToRequest } = useApp();

  const sorted = [...userRequests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="app-page">
      <PageHeader
        title="Requests"
        subtitle={`${userRequests.filter((r) => r.status === 'pending').length} pending`}
      />

      <div className="card-list">
        {sorted.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No requests yet"
            message="Apply to jobs or wait for employers to invite you. Your requests will appear here."
            actionLabel="Browse Jobs"
            actionTo="/worker/jobs"
          />
        ) : (
          sorted.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              worker={getWorker(req.workerId)}
              business={getBusiness(req.businessId)}
              job={jobs.find((j) => j.id === req.jobId)}
              viewerRole="worker"
              onAccept={(id) => respondToRequest(id, 'accepted')}
              onReject={(id) => respondToRequest(id, 'rejected')}
            />
          ))
        )}
      </div>
      <BottomNav role="worker" />
    </div>
  );
}
