import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import BottomNav from '../../components/BottomNav';
import { PageHeader, Toggle, FormField } from '../../components/UI';
import { CATEGORIES, SPECIALIZATIONS } from '../../constants/categories';

export default function WorkerProfile() {
  const navigate = useNavigate();
  const { profile, updateProfile, logout } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile || {});

  if (!profile) return null;

  const specs = form.category ? SPECIALIZATIONS[form.category] || [] : [];

  const handleSave = () => {
    updateProfile({
      ...form,
      experience: parseInt(form.experience, 10) || 0,
      availability: form.needWork ? 'available' : 'offline',
    });
    setEditing(false);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="app-page">
      <PageHeader title="My Profile" />

      <div className="profile-header">
        <div className="profile-avatar">{(profile.fullName || '?')[0]}</div>
        <div>
          <h2>{profile.fullName}</h2>
          <p>{profile.specialization} · {profile.category}</p>
          {profile.verified && <span className="badge badge-verified">Verified</span>}
        </div>
      </div>

      {!editing ? (
        <>
          <div className="profile-stats">
            <div className="stat"><strong>{profile.trustScore || '—'}</strong><span>Trust Score</span></div>
            <div className="stat"><strong>{profile.jobsCompleted || 0}</strong><span>Jobs Done</span></div>
            <div className="stat"><strong className={profile.availability === 'available' ? 'text-green' : ''}>{profile.availability}</strong><span>Status</span></div>
          </div>
          <div className="profile-details">
            <div className="detail-row"><span>Phone</span><strong>{profile.phone}</strong></div>
            <div className="detail-row"><span>Email</span><strong>{profile.email || '—'}</strong></div>
            <div className="detail-row"><span>Gender</span><strong>{profile.gender}</strong></div>
            <div className="detail-row"><span>Age</span><strong>{profile.age}</strong></div>
            <div className="detail-row"><span>Location</span><strong>{profile.location?.locality}</strong></div>
            <div className="detail-row"><span>Skills</span><strong>{profile.skills}</strong></div>
            <div className="detail-row"><span>Experience</span><strong>{profile.experience} years</strong></div>
            <div className="detail-row"><span>Expected Pay</span><strong>{profile.expectedPay}</strong></div>
          </div>
          <button className="btn btn-primary btn-block" onClick={() => { setForm(profile); setEditing(true); }} type="button">Edit Profile</button>
        </>
      ) : (
        <div className="onboard-form">
          <FormField label="Skills"><input value={form.skills || ''} onChange={(e) => set('skills', e.target.value)} /></FormField>
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
          <FormField label="Expected Pay"><input value={form.expectedPay || ''} onChange={(e) => set('expectedPay', e.target.value)} /></FormField>
          <Toggle checked={form.needWork !== false} onChange={(v) => set('needWork', v)} label="I Need Work" />
          <button className="btn btn-primary btn-block" onClick={handleSave} type="button">Save Changes</button>
          <button className="btn btn-outline btn-block" onClick={() => setEditing(false)} type="button">Cancel</button>
        </div>
      )}

      <button className="btn btn-outline btn-block logout-btn" onClick={() => { logout(); navigate('/'); }} type="button">Sign Out</button>
      <BottomNav role="worker" />
    </div>
  );
}
