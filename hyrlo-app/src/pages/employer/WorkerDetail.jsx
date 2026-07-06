import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { MapPin, Star } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDistance } from '../../utils/distance';
import BottomNav from '../../components/BottomNav';
import { TrustBadges, PageHeader } from '../../components/UI';

export default function WorkerDetail() {
  const { id } = useParams();
  const { getWorker, matchedWorkers, invite } = useApp();
  const [toast, setToast] = useState('');

  const worker = getWorker(id);
  const matched = matchedWorkers.find((w) => w.id === id);

  if (!worker) {
    return (
      <div className="app-page">
        <PageHeader title="Worker Not Found" backTo="/employer/workers" />
        <BottomNav role="employer" />
      </div>
    );
  }

  const handleHire = () => {
    const result = invite(worker.id, null, `Interested in hiring ${worker.fullName}`);
    if (result?.error) setToast(result.error);
    else setToast('Hire request sent!');
  };

  return (
    <div className="app-page">
      <PageHeader title={worker.fullName} backTo="/employer/workers" />
      {toast && <div className="toast">{toast}</div>}

      <div className="detail-card">
        <div className="profile-header">
          <div className="profile-avatar">{(worker.fullName || '?')[0]}</div>
          <div>
            <h2>{worker.fullName}</h2>
            <p>{worker.specialization} · {worker.category}</p>
            <TrustBadges verified={worker.verified} availability={worker.availability} nearby={matched?.distance < 2} />
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat"><strong><Star size={14} fill="currentColor" /> {worker.trustScore}</strong><span>Rating</span></div>
          <div className="stat"><strong>{worker.jobsCompleted}</strong><span>Jobs Done</span></div>
          <div className="stat"><strong>{worker.experience}y</strong><span>Experience</span></div>
        </div>

        {matched?.distance != null && (
          <p className="detail-distance"><MapPin size={16} /> {formatDistance(matched.distance)} away</p>
        )}

        <div className="profile-details">
          <div className="detail-row"><span>Phone</span><strong>{worker.phone}</strong></div>
          <div className="detail-row"><span>Skills</span><strong>{worker.skills}</strong></div>
          <div className="detail-row"><span>Expected Pay</span><strong>{worker.expectedPay}</strong></div>
          <div className="detail-row"><span>Location</span><strong>{worker.location?.locality}</strong></div>
          <div className="detail-row"><span>Bio</span><strong>{worker.bio || '—'}</strong></div>
        </div>

        {worker.needWork !== false && (
          <button className="btn btn-accent btn-lg btn-block" onClick={handleHire} type="button">
            Send Hire Request
          </button>
        )}
      </div>
      <BottomNav role="employer" />
    </div>
  );
}
