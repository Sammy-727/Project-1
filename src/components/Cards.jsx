import { Link } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';
import { formatDistance } from '../utils/distance';
import { TrustBadges } from './UI';

export default function JobCard({ job, onApply, showApply, linkTo }) {
  const content = (
    <div className="card job-card">
      <div className="card-top">
        <div>
          <h3>{job.title}</h3>
          <p className="card-meta">{job.businessName || job.category}</p>
        </div>
        <TrustBadges urgent={job.urgent} nearby={job.distance < 2} />
      </div>
      <div className="card-details">
        <span className="card-tag">{job.category}</span>
        <span className="card-tag">{job.specialization}</span>
        <span className="card-pay">{job.pay}</span>
      </div>
      {job.distance != null && (
        <div className="card-distance">
          <MapPin size={14} /> {formatDistance(job.distance)}
        </div>
      )}
      <div className="card-actions">
        {linkTo && <Link to={linkTo} className="btn btn-outline btn-sm">View</Link>}
        {showApply && onApply && (
          <button className="btn btn-primary btn-sm" onClick={(e) => { e.preventDefault(); onApply(job); }} type="button">
            Apply
          </button>
        )}
      </div>
    </div>
  );

  if (linkTo) return <Link to={linkTo} className="card-link">{content}</Link>;
  return content;
}

export function WorkerCard({ worker, onHire, showHire, linkTo }) {
  const content = (
    <div className="card worker-card">
      <div className="card-top">
        <div className="card-avatar-row">
          <div className="avatar">{(worker.fullName || '?')[0]}</div>
          <div>
            <h3>{worker.fullName}</h3>
            <p className="card-meta">{worker.specialization}</p>
          </div>
        </div>
        <TrustBadges verified={worker.verified} availability={worker.availability} nearby={worker.distance < 2} />
      </div>
      <div className="card-details">
        <span className="card-tag">{worker.category}</span>
        <span className="card-rating"><Star size={14} fill="currentColor" /> {worker.trustScore || '—'}</span>
        <span className="card-pay">{worker.expectedPay}</span>
      </div>
      {worker.distance != null && (
        <div className="card-distance">
          <MapPin size={14} /> {formatDistance(worker.distance)}
        </div>
      )}
      <div className="card-actions">
        {linkTo && <Link to={linkTo} className="btn btn-outline btn-sm">View</Link>}
        {showHire && onHire && worker.needWork !== false && (
          <button className="btn btn-accent btn-sm" onClick={(e) => { e.preventDefault(); onHire(worker); }} type="button">
            Hire
          </button>
        )}
      </div>
    </div>
  );

  if (linkTo) return <Link to={linkTo} className="card-link">{content}</Link>;
  return content;
}

export function RequestCard({ request, worker, business, job, onAccept, onReject, viewerRole }) {
  const isIncoming = viewerRole === 'worker'
    ? request.type === 'employer_invited' && request.status === 'pending'
    : request.type === 'worker_applied' && request.status === 'pending';

  return (
    <div className="card request-card">
      <div className="card-top">
        <div>
          <h3>{request.type === 'worker_applied' ? `${worker?.fullName || 'Worker'} applied` : `${business?.businessName || 'Business'} invited`}</h3>
          <p className="card-meta">{job?.title || business?.businessName || worker?.fullName}</p>
        </div>
        <span className={`status-badge status-${request.status}`}>{request.status}</span>
      </div>
      {request.message && <p className="request-message">{request.message}</p>}
      <p className="request-time">{new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
      {isIncoming && onAccept && onReject && (
        <div className="card-actions">
          <button className="btn btn-primary btn-sm" onClick={() => onAccept(request.id)} type="button">Accept</button>
          <button className="btn btn-outline btn-sm" onClick={() => onReject(request.id)} type="button">Reject</button>
        </div>
      )}
    </div>
  );
}
