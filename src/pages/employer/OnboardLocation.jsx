import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOnboarding, completeOnboarding } from '../../services/storage';
import { DEFAULT_LOCATION } from '../../constants/categories';
import { useApp } from '../../context/AppContext';

export default function EmployerLocation() {
  const navigate = useNavigate();
  const { login, refresh } = useApp();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const onboard = getOnboarding();
    const profile = await completeOnboarding('employer', {
      ...onboard,
      location: {
        ...DEFAULT_LOCATION,
        locality: onboard.locality || 'Central Bangalore',
        address: onboard.address || DEFAULT_LOCATION.address,
      },
      totalHires: 0,
      verified: false,
    });
    login({ id: profile.id, role: 'employer' });
    await refresh();
    navigate('/employer/dashboard');
  };

  const grantLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {});
    }
  };

  return (
    <div className="onboard-screen">
      <div className="onboard-header">
        <button className="back-btn" onClick={() => navigate(-1)} type="button">←</button>
        <div className="onboard-progress"><div className="progress-fill" style={{ width: '100%' }} /></div>
        <span className="step-label">Step 4 of 4</span>
      </div>
      <h2>Business Location</h2>
      <p className="onboard-sub">Help workers find your business nearby</p>

      <form onSubmit={handleSubmit} className="onboard-form">
        <button type="button" className="btn btn-outline btn-block location-btn" onClick={grantLocation}>
          📍 Allow Location Access
        </button>
        <div className="info-box">
          <p>Location: <strong>{getOnboarding().locality || 'Central Bangalore'}</strong></p>
          <p>We'll show workers within 12 km of your business.</p>
        </div>
        <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={loading}>
          {loading ? 'Setting up...' : 'Go to Dashboard'}
        </button>
      </form>
    </div>
  );
}
