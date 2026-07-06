import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOnboarding, completeOnboarding } from '../../services/storage';
import { DEFAULT_LOCATION } from '../../constants/categories';
import { validateWorkerLocation, hasErrors } from '../../utils/validation';
import { FormField } from '../../components/UI';
import { useApp } from '../../context/AppContext';

export default function WorkerLocation() {
  const navigate = useNavigate();
  const { login, refresh } = useApp();
  const [form, setForm] = useState({ locality: 'Central Bangalore', address: DEFAULT_LOCATION.address });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateWorkerLocation(form);
    setErrors(errs);
    if (hasErrors(errs)) return;

    setLoading(true);
    const onboard = getOnboarding();
    const profile = await completeOnboarding('worker', {
      ...onboard,
      experience: parseInt(onboard.experience, 10) || 0,
      age: parseInt(onboard.age, 10),
      location: { ...DEFAULT_LOCATION, locality: form.locality, address: form.address },
      availability: onboard.needWork ? 'available' : 'offline',
      verified: false,
      trustScore: 0,
      jobsCompleted: 0,
      profilePhoto: null,
    });
    login({ id: profile.id, role: 'worker' });
    await refresh();
    navigate('/worker/jobs');
  };

  const grantLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm({
            locality: 'Your Location',
            address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
          });
        },
        () => setForm({ locality: 'Central Bangalore', address: DEFAULT_LOCATION.address })
      );
    }
  };

  return (
    <div className="onboard-screen">
      <div className="onboard-header">
        <button className="back-btn" onClick={() => navigate(-1)} type="button">←</button>
        <div className="onboard-progress"><div className="progress-fill" style={{ width: '100%' }} /></div>
        <span className="step-label">Step 4 of 4</span>
      </div>
      <h2>Your Location</h2>
      <p className="onboard-sub">We use your location to find nearby jobs within 12 km</p>

      <form onSubmit={handleSubmit} className="onboard-form">
        <button type="button" className="btn btn-outline btn-block location-btn" onClick={grantLocation}>
          📍 Allow Location Access
        </button>
        <FormField label="Locality / Area" error={errors.location}>
          <input value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} placeholder="Your area or locality" />
        </FormField>
        <FormField label="Address">
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
        </FormField>
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? 'Setting up...' : 'Go to Dashboard'}
        </button>
      </form>
    </div>
  );
}
