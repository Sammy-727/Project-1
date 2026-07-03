(function initDashboardCharts() {
  const root = document.getElementById('dashboardChartsRoot');
  if (!root || typeof Chart === 'undefined') return;

  let revenueChart = null;

  const palette = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: dark ? '#94a3b8' : '#64748b',
      grid: dark ? '#1e293b' : '#f1f5f9',
      primary: '#4f46e5',
    };
  };

  function showState(prefix, state) {
    const skeleton = document.getElementById(`${prefix}Skeleton`);
    const wrap = document.getElementById(`${prefix}Wrap`);
    const demo = document.getElementById(`${prefix}Demo`);
    const empty = document.getElementById(`${prefix}Empty`);
    if (skeleton) skeleton.hidden = state !== 'loading';
    if (wrap) wrap.hidden = state !== 'ready';
    if (demo) demo.hidden = state !== 'demo';
    if (empty) empty.hidden = state !== 'empty';
  }

  function renderRevenue(data, isDemo) {
    const c = palette();
    const canvas = document.getElementById('revenueChart');
    const compact = (data || []).slice(-3);
    if (!canvas || !compact.length) {
      showState('revenueChart', 'empty');
      return;
    }
    showState('revenueChart', isDemo ? 'demo' : 'ready');
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: compact.map((d) => d.month),
        datasets: [{
          label: 'Revenue',
          data: compact.map((d) => d.revenue),
          backgroundColor: 'rgba(79, 70, 229, 0.75)',
          borderRadius: 6,
          maxBarThickness: 36,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: c.text, font: { size: 11 } } },
          y: {
            grid: { color: c.grid },
            ticks: {
              color: c.text,
              font: { size: 11 },
              callback: (v) => `₹${Number(v).toLocaleString('en-IN', { notation: 'compact' })}`,
            },
          },
        },
      },
    });
  }

  async function loadCharts() {
    showState('revenueChart', 'loading');
    try {
      const { data } = await axios.get('/api/dashboard/charts/revenue-trend');
      if (!data?.ok) throw new Error(data?.error || 'Chart request failed');
      renderRevenue(data.data || [], !!data.isDemo);
    } catch (err) {
      console.error(err);
      renderRevenue(
        [
          { month: 'Apr', revenue: 58000 },
          { month: 'May', revenue: 67000 },
          { month: 'Jun', revenue: 72000 },
        ],
        true,
      );
    }
  }

  document.addEventListener('DOMContentLoaded', loadCharts);
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    setTimeout(loadCharts, 120);
  });
})();
