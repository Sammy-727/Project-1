import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './context/AppContext';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

import WorkerBasic from './pages/worker/OnboardBasic';
import WorkerPersonal from './pages/worker/OnboardPersonal';
import WorkerWork from './pages/worker/OnboardWork';
import WorkerLocation from './pages/worker/OnboardLocation';
import WorkerJobs from './pages/worker/Jobs';
import JobDetail from './pages/worker/JobDetail';
import WorkerRequests from './pages/worker/Requests';
import WorkerEmployment from './pages/worker/Employment';
import WorkerProfile from './pages/worker/Profile';

import EmployerOwner from './pages/employer/OnboardOwner';
import EmployerBusiness from './pages/employer/OnboardBusiness';
import EmployerRequirement from './pages/employer/OnboardRequirement';
import EmployerLocation from './pages/employer/OnboardLocation';
import EmployerDashboard from './pages/employer/Dashboard';
import NearbyWorkers from './pages/employer/NearbyWorkers';
import WorkerDetail from './pages/employer/WorkerDetail';
import EmployerRequests from './pages/employer/Requests';
import EmployerProfile from './pages/employer/Profile';

function ProtectedRoute({ children, role }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'employer' ? '/employer/dashboard' : '/worker/jobs'} replace />;
  }
  return children;
}

export default function App() {
  const { user, loading } = useApp();

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={user.role === 'employer' ? '/employer/dashboard' : '/worker/jobs'} /> : <Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      {/* Worker onboarding */}
      <Route path="/onboard/worker/basic" element={<WorkerBasic />} />
      <Route path="/onboard/worker/personal" element={<WorkerPersonal />} />
      <Route path="/onboard/worker/work" element={<WorkerWork />} />
      <Route path="/onboard/worker/location" element={<WorkerLocation />} />

      {/* Employer onboarding */}
      <Route path="/onboard/employer/owner" element={<EmployerOwner />} />
      <Route path="/onboard/employer/business" element={<EmployerBusiness />} />
      <Route path="/onboard/employer/requirement" element={<EmployerRequirement />} />
      <Route path="/onboard/employer/location" element={<EmployerLocation />} />

      {/* Worker app */}
      <Route path="/worker/jobs" element={<ProtectedRoute role="worker"><WorkerJobs /></ProtectedRoute>} />
      <Route path="/worker/jobs/:id" element={<ProtectedRoute role="worker"><JobDetail /></ProtectedRoute>} />
      <Route path="/worker/requests" element={<ProtectedRoute role="worker"><WorkerRequests /></ProtectedRoute>} />
      <Route path="/worker/employment" element={<ProtectedRoute role="worker"><WorkerEmployment /></ProtectedRoute>} />
      <Route path="/worker/profile" element={<ProtectedRoute role="worker"><WorkerProfile /></ProtectedRoute>} />

      {/* Employer app */}
      <Route path="/employer/dashboard" element={<ProtectedRoute role="employer"><EmployerDashboard /></ProtectedRoute>} />
      <Route path="/employer/workers" element={<ProtectedRoute role="employer"><NearbyWorkers /></ProtectedRoute>} />
      <Route path="/employer/workers/:id" element={<ProtectedRoute role="employer"><WorkerDetail /></ProtectedRoute>} />
      <Route path="/employer/requests" element={<ProtectedRoute role="employer"><EmployerRequests /></ProtectedRoute>} />
      <Route path="/employer/profile" element={<ProtectedRoute role="employer"><EmployerProfile /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
