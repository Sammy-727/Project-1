import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import BottomNav from '../../components/BottomNav';
import { WorkerCard } from '../../components/Cards';
import { SearchBar, FilterChips, EmptyState, PageHeader } from '../../components/UI';
import { Users } from 'lucide-react';

const FILTERS = [
  { value: 'nearest', label: 'Nearest' },
  { value: 'available', label: 'Available' },
  { value: 'experienced', label: 'Experienced' },
  { value: 'rating', label: 'Top Rated' },
];

export default function NearbyWorkers() {
  const { matchedWorkers, invite } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('nearest');
  const [toast, setToast] = useState('');

  const filtered = useMemo(() => {
    let list = [...matchedWorkers];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((w) =>
        w.fullName?.toLowerCase().includes(q) ||
        w.skills?.toLowerCase().includes(q) ||
        w.specialization?.toLowerCase().includes(q)
      );
    }
    if (filter === 'available') list = list.filter((w) => w.availability === 'available' && w.needWork !== false);
    if (filter === 'experienced') list.sort((a, b) => (b.experience || 0) - (a.experience || 0));
    else if (filter === 'rating') list.sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0));
    else list.sort((a, b) => a.distance - b.distance);
    return list;
  }, [matchedWorkers, search, filter]);

  const handleHire = (worker) => {
    const result = invite(worker.id, null, `We'd like to hire you for ${worker.specialization}`);
    if (result?.error) setToast(result.error);
    else {
      setToast('Hire request sent!');
      setTimeout(() => setToast(''), 2500);
    }
  };

  return (
    <div className="app-page">
      <PageHeader title="Nearby Workers" subtitle={`${filtered.length} workers within 12 km`} />
      <SearchBar value={search} onChange={setSearch} placeholder="Search by name, skill, location..." />
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

      {toast && <div className="toast">{toast}</div>}

      <div className="card-list">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No available workers"
            message="No workers match your category and specialization within 12 km."
            actionLabel="Update Business"
            actionTo="/employer/profile"
          />
        ) : (
          filtered.map((w) => (
            <WorkerCard
              key={w.id}
              worker={w}
              linkTo={`/employer/workers/${w.id}`}
              showHire
              onHire={handleHire}
            />
          ))
        )}
      </div>
      <BottomNav role="employer" />
    </div>
  );
}
