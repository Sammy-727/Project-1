import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import BottomNav from '../../components/BottomNav';
import { PageHeader, Toggle, FormField } from '../../components/UI';
import { CATEGORIES, SPECIALIZATIONS } from '../../constants/categories';

export default function EmployerProfile() {
  const navigate = useNavigate();
  const { profile, updateProfile, logout, pendingRequests } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile || {});

  if (!profile) return null;

  const specs = form.category ? SPECIALIZATIONS[form.category] || [] : [];

  const handleSave = () => {
    updateProfile(form);
    setEditing(false);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="app-page">
      <PageHeader title="Business Profile" />

      <div className="profile-header">
        <div className="profile-avatar business">{(profile.businessName || '?')[0]}</div>
        <div>
          <h2>{profile.businessName}</h2>
          <p>{profile.category} · {profile.specialization}</p>
          {profile.verified && <span className="badge badge-verified">Verified</span>}
        </div>
      </div>

      {!editing ? (
        <>
          <div className="profile-stats">
            <div className="stat"><strong>{profile.totalHires || 0}</strong><span>Total Hires</span></div>
            <div className="stat"><strong>{pendingRequests.length}</strong><span>Pending</span></div>
            <div className="stat"><strong className={profile.needWorker ? 'text-green' : ''}>{profile.needWorker ? 'Hiring' : 'Paused'}</strong><span>Status</span></div>
          </div>
          <div className="profile-details">
            <div className="detail-row"><span>Owner</span><strong>{profile.ownerName}</strong></div>
            <div className="detail-row"><span>Phone</span><strong>{profile.phone}</strong></div>
            <div className="detail-row"><span>Location</span><strong>{profile.location?.locality || profile.locality}</strong></div>
            <div className="detail-row"><span>Requirement</span><strong>{profile.requirement}</strong></div>
          </div>
          <button className="btn btn-accent btn-block" onClick={() => { setForm(profile); setEditing(true); }} type="button">Edit Business</button>
        </>
      ) : (
        <div className="onboard-form">
          <FormField label="Business Name"><input value={form.businessName || ''} onChange={(e) => set('businessName', e.target.value)} /></FormField>
          <FormField label="Category">
            <select value={form.category || ''} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Specialization">
            <select value={form.specialization || ''} onChange={(e) => set('specialization', e.target.value)}>
              {specs.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Requirement"><textarea value={form.requirement || ''} onChange={(e) => set('requirement', e.target.value)} rows={3} /></FormField>
          <Toggle checked={form.needWorker !== false} onChange={(v) => set('needWorker', v)} label="Actively Hiring" />
          <button className="btn btn-accent btn-block" onClick={handleSave} type="button">Save Changes</button>
          <button className="btn btn-outline btn-block" onClick={() => setEditing(false)} type="button">Cancel</button>
        </div>
      )}

      <button className="btn btn-outline btn-block logout-btn" onClick={() => { logout(); navigate('/'); }} type="button">Sign Out</button>
      <BottomNav role="employer" />
    </div>
  );
}
