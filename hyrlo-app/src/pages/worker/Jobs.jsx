import { useState, useMemo } from 'react';
import { Briefcase } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import BottomNav from '../../components/BottomNav';
import JobCard from '../../components/Cards';
import { SearchBar, FilterChips, EmptyState, PageHeader } from '../../components/UI';

const FILTERS = [
  { value: 'nearest', label: 'Nearest' },
  { value: 'latest', label: 'Latest' },
  { value: 'urgent', label: 'Urgent' },
];

export default function WorkerJobs() {
  const { matchedJobs, apply } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('nearest');
  const [toast, setToast] = useState('');

  const filtered = useMemo(() => {
    let list = [...matchedJobs];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((j) =>
        j.title?.toLowerCase().includes(q) ||
        j.category?.toLowerCase().includes(q) ||
        j.businessName?.toLowerCase().includes(q) ||
        j.requiredSkills?.toLowerCase().includes(q)
      );
    }
    if (filter === 'urgent') list = list.filter((j) => j.urgent);
    if (filter === 'latest') list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  else list.sort((a, b) => a.distance - b.distance);
    return list;
  }, [matchedJobs, search, filter]);

  const handleApply = (job) => {
    const result = apply(job.id, `Interested in ${job.title}`);
    if (result?.error) setToast(result.error);
    else {
      setToast('Application sent!');
      setTimeout(() => setToast(''), 2500);
    }
  };

  return (
    <div className="app-page">
      <PageHeader title="Jobs Near You" subtitle={`${filtered.length} matching jobs within 12 km`} />
      <SearchBar value={search} onChange={setSearch} placeholder="Search jobs, skills, location..." />
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

      {toast && <div className="toast">{toast}</div>}

      <div className="card-list">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No matching jobs"
            message="Try adjusting your skills or location. We'll show jobs that match your category within 12 km."
            actionLabel="Update Profile"
            actionTo="/worker/profile"
          />
        ) : (
          filtered.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              linkTo={`/worker/jobs/${job.id}`}
              showApply
              onApply={handleApply}
            />
          ))
        )}
      </div>
      <BottomNav role="worker" />
    </div>
  );
}
