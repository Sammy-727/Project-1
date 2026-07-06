import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  initStorage, getCurrentUser, setCurrentUser as saveUser,
  getWorkers, getBusinesses, getJobs, getRequests,
  getWorker, getBusiness, saveWorker, saveBusiness,
  applyToJob, inviteWorker, updateRequestStatus,
} from '../services/storage';
import { matchWorkersForBusiness, matchJobsForWorker, matchBusinessesForWorker } from '../utils/matching';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setWorkers(getWorkers());
    setBusinesses(getBusinesses());
    setJobs(getJobs());
    setRequests(getRequests());
    setUser(getCurrentUser());
  }, []);

  useEffect(() => {
    initStorage();
    refresh();
    setLoading(false);
  }, [refresh]);

  const login = (userData) => {
    saveUser(userData);
    setUser(userData);
  };

  const logout = () => {
    saveUser(null);
    setUser(null);
  };

  const getProfile = () => {
    if (!user) return null;
    return user.role === 'worker' ? getWorker(user.id) : getBusiness(user.id);
  };

  const updateProfile = (data) => {
    if (!user) return;
    if (user.role === 'worker') {
      saveWorker({ ...getWorker(user.id), ...data });
    } else {
      saveBusiness({ ...getBusiness(user.id), ...data });
    }
    refresh();
  };

  const apply = (jobId, message) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job || !user) return { error: 'Invalid request' };
    const result = applyToJob(user.id, job.businessId, jobId, message);
    refresh();
    return result;
  };

  const invite = (workerId, jobId, message) => {
    if (!user) return { error: 'Not logged in' };
    const result = inviteWorker(user.id, workerId, user.id, jobId, message);
    refresh();
    return result;
  };

  const respondToRequest = (requestId, status) => {
    updateRequestStatus(requestId, status);
    refresh();
  };

  const profile = getProfile();

  const matchedJobs = user?.role === 'worker' && profile
    ? matchJobsForWorker(profile, jobs, businesses, profile.location)
    : [];

  const matchedBusinesses = user?.role === 'worker' && profile
    ? matchBusinessesForWorker(profile, businesses, profile.location)
    : [];

  const matchedWorkers = user?.role === 'employer' && profile
    ? matchWorkersForBusiness(profile, workers, profile.location)
    : [];

  const userRequests = user
    ? requests.filter((r) =>
        r.workerId === user.id || r.businessId === user.id ||
        r.senderId === user.id || r.receiverId === user.id
      )
    : [];

  const pendingRequests = userRequests.filter((r) => r.status === 'pending');
  const acceptedRequests = userRequests.filter((r) => r.status === 'accepted');

  return (
    <AppContext.Provider value={{
      user, profile, workers, businesses, jobs, requests,
      loading, refresh, login, logout, updateProfile,
      apply, invite, respondToRequest,
      matchedJobs, matchedBusinesses, matchedWorkers,
      userRequests, pendingRequests, acceptedRequests,
      getWorker, getBusiness,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
