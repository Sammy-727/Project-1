import { MAX_DISTANCE_KM, RELATED_CATEGORIES } from '../constants/categories';
import { calculateDistance, isWithinRange } from './distance';

function getMatchScore(item, target) {
  let score = 0;
  const itemCat = item.category || '';
  const targetCat = target.category || '';
  const itemSpec = (item.specialization || '').toLowerCase();
  const targetSpec = (target.specialization || '').toLowerCase();

  if (itemCat === targetCat) score += 10;
  else if ((RELATED_CATEGORIES[targetCat] || []).includes(itemCat)) score += 4;

  if (itemSpec && targetSpec) {
    if (itemSpec === targetSpec) score += 8;
    else if (itemSpec.includes(targetSpec) || targetSpec.includes(itemSpec)) score += 5;
    else if (item.skills && target.skills) {
      const itemSkills = item.skills.toLowerCase().split(',').map((s) => s.trim());
      const targetSkills = target.skills.toLowerCase().split(',').map((s) => s.trim());
      if (itemSkills.some((s) => targetSkills.some((t) => s.includes(t) || t.includes(s)))) score += 3;
    }
  }

  if (item.needWork || item.needWorker) score += 2;
  if (item.availability === 'available' || item.needWork) score += 1;
  if (item.urgent || item.jobType === 'urgent') score += 2;

  return score;
}

export function matchWorkersForBusiness(business, workers, userLocation) {
  const origin = userLocation || business.location;
  if (!origin?.lat) return [];

  return workers
    .map((worker) => {
      const distance = calculateDistance(
        origin.lat, origin.lng,
        worker.location?.lat, worker.location?.lng
      );
      const score = getMatchScore(worker, business);
      return { ...worker, distance, matchScore: score };
    })
    .filter((w) => isWithinRange(w.distance, MAX_DISTANCE_KM) && w.matchScore >= 4)
    .filter((w) => w.needWork !== false)
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.distance - b.distance;
    });
}

export function matchJobsForWorker(worker, jobs, businesses, userLocation) {
  const origin = userLocation || worker.location;
  if (!origin?.lat) return [];

  const bizMap = Object.fromEntries(businesses.map((b) => [b.id, b]));

  return jobs
    .map((job) => {
      const business = bizMap[job.businessId] || {};
      const jobLoc = job.location || business.location;
      const distance = calculateDistance(
        origin.lat, origin.lng,
        jobLoc?.lat, jobLoc?.lng
      );
      const target = { category: job.category, specialization: job.specialization, skills: job.requiredSkills };
      const score = getMatchScore({ ...worker, category: worker.category, specialization: worker.specialization }, target);
      const bizScore = getMatchScore(worker, business);
      const finalScore = Math.max(score, bizScore);
      return {
        ...job,
        business,
        distance,
        matchScore: finalScore,
        businessName: business.businessName || job.businessName,
      };
    })
    .filter((j) => isWithinRange(j.distance, MAX_DISTANCE_KM) && j.matchScore >= 4)
    .filter((j) => j.status !== 'closed')
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      return a.distance - b.distance;
    });
}

export function matchBusinessesForWorker(worker, businesses, userLocation) {
  const origin = userLocation || worker.location;
  if (!origin?.lat) return [];

  return businesses
    .map((biz) => {
      const distance = calculateDistance(
        origin.lat, origin.lng,
        biz.location?.lat, biz.location?.lng
      );
      const score = getMatchScore(biz, worker);
      return { ...biz, distance, matchScore: score };
    })
    .filter((b) => isWithinRange(b.distance, MAX_DISTANCE_KM) && b.matchScore >= 4)
    .filter((b) => b.needWorker !== false)
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.distance - b.distance;
    });
}
