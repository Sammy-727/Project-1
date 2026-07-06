import { NavLink } from 'react-router-dom';
import { Briefcase, Users, FileText, User, LayoutDashboard } from 'lucide-react';

export default function BottomNav({ role }) {
  const workerTabs = [
    { to: '/worker/jobs', icon: Briefcase, label: 'Jobs' },
    { to: '/worker/requests', icon: FileText, label: 'Requests' },
    { to: '/worker/employment', icon: Users, label: 'Employment' },
    { to: '/worker/profile', icon: User, label: 'Profile' },
  ];

  const employerTabs = [
    { to: '/employer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/employer/requests', icon: FileText, label: 'Requests' },
    { to: '/employer/workers', icon: Users, label: 'Workers' },
    { to: '/employer/profile', icon: User, label: 'Profile' },
  ];

  const tabs = role === 'employer' ? employerTabs : workerTabs;

  return (
    <nav className="bottom-nav">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
        >
          <Icon size={22} strokeWidth={1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
