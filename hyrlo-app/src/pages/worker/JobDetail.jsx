import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { MapPin, Star } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDistance } from '../../utils/distance';
import BottomNav from '../../components/BottomNav';
import { TrustBadges, PageHeader } from '../../components/UI';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { jobs, businesses, matchedJobs, apply } = useApp();
  const [toast, setToast] = useState('');

  const job = jobs.find((j) => j.id === id);
  const matched = matchedJobs.find((j) => j.id === id);
  const business = businesses.find((b) => b.id === job?.businessId);

  if (!job) {
    return (
      <div className="app-page">
        <PageHeader title="Job Not Found" backTo="/worker/jobs" />
        <BottomNav role="worker" />
      </div>
    );
  }

  const distance = matched?.distance;

  const handleApply = () => {
    const result = apply(job.id, `Interested in ${job.title}`);
    if (result?.error) setToast(result.error);
    else {
      setToast('Application sent successfully!');
      setTimeout(() => navigate('/worker/requests'), 1500);
    }
  };

  return (
    <div className="app-page">
      <PageHeader title={job.title} backTo="/worker/jobs" />
      {toast && <div className="toast">{toast}</div>}

      <div className="detail-card">
        <TrustBadges urgent={job.urgent} nearby={distance < 2} />
        <h2>{business?.businessName || job.category}</h2>
        <div className="detail-tags">
          <span className="card-tag">{job.category}</span>
          <span className="card-tag">{job.specialization}</span>
          <span className="card-tag">{job.jobType}</span>
        </div>
        <p className="detail-pay">{job.pay}</p>
        {distance != null && (
          <p className="detail-distance"><MapPin size={16} /> {formatDistance(distance)} away</p>
        )}
        <div className="detail-section">
          <h4>Description</h4>
          <p>{job.description}</p>
        </div>
        <div className="detail-section">
          <h4>Required Skills</h4>
          <p>{job.requiredSkills}</p>
        </div>
        {business && (
          <div className="detail-section">
            <h4>Business</h4>
            <p>{business.businessName} · {business.locality || business.location?.locality}</p>
            {business.verified && <span className="badge badge-verified">Verified</span>}
          </div>
        )}
        <button className="btn btn-primary btn-lg btn-block" onClick={handleApply} type="button">
          Apply to this Job
        </button>
      </div>
      <BottomNav role="worker" />
    </div>
  );
}
