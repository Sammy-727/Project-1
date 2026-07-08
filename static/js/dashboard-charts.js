(function initDashboardCharts() {
  const root = document.getElementById('dashboardChartsRoot');
  if (!root || typeof Chart === 'undefined') return;

  let revenueChart = null;
  let occupancyChart = null;

  const palette = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: dark ? '#94a3b8' : '#64748b',
      grid: dark ? '#1e293b' : '#f1f5f9',
      primary: '#4f46e5',
      today: '#059669',
      donut: ['#22c55e', '#6366f1', '#3b82f6', '#f59e0b', '#94a3b8'],
    };
  };

  function showState(prefix, state) {
    const skeleton = document.getElementById(`${prefix}Skeleton`);
    const wrap = document.getElementById(`${prefix}Wrap`);
    const empty = document.getElementById(`${prefix}Empty`);
    if (skeleton) skeleton.hidden = state !== 'loading';
    if (wrap) wrap.hidden = state !== 'ready';
    if (empty) empty.hidden = state !== 'empty';
  }

  function formatInr(value) {
    return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }

  function setRevenueTrend(rows) {
    const el = document.getElementById('trendRevenue');
    if (!el || !rows || rows.length < 2) return;
    const today = rows[rows.length - 1];
    const yesterday = rows[rows.length - 2];
    const diff = Number(today?.revenue || 0) - Number(yesterday?.revenue || 0);
    if (diff === 0) {
      el.className = 'exec-kpi-trend neutral';
      el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>';
    } else if (diff > 0) {
      el.className = 'exec-kpi-trend up';
      el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>';
    } else {
      el.className = 'exec-kpi-trend down';
      el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';
    }
    el.hidden = false;
    el.removeAttribute('aria-hidden');
  }

  function renderSparkline(canvasId, values) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !values?.length || typeof Chart === 'undefined') return;
    const c = palette();
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();
    new Chart(canvas, {
      type: 'line',
      data: {
        labels: values.map((_, i) => i),
        datasets: [{
          data: values,
          borderColor: c.primary,
          backgroundColor: 'rgba(79, 70, 229, 0.12)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 1.5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
        animation: { duration: 400 },
      },
    });
  }

  function renderRevenue(payload) {
    const c = palette();
    const canvas = document.getElementById('revenueChart');
    const rows = payload?.data || [];
    const hasRevenue = rows.some((d) => Number(d.revenue) > 0);

    setRevenueTrend(rows);
    renderSparkline('sparkRevenue', rows.map((d) => d.revenue));

    if (!canvas || !rows.length || !hasRevenue) {
      showState('revenueChart', 'empty');
      return;
    }

    showState('revenueChart', 'ready');
    if (revenueChart) revenueChart.destroy();

    const pointRadius = rows.map((d) => (d.isToday ? 5 : 3));
    const pointBg = rows.map((d) => (d.isToday ? c.today : c.primary));

    revenueChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: rows.map((d) => d.label),
        datasets: [{
          label: 'Revenue',
          data: rows.map((d) => d.revenue),
          borderColor: c.primary,
          backgroundColor: 'rgba(79, 70, 229, 0.08)',
          fill: true,
          tension: 0.35,
          pointRadius,
          pointBackgroundColor: pointBg,
          pointBorderColor: pointBg,
          pointHoverRadius: 6,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const row = rows[idx];
                return row?.isToday ? `${row.label} (Today)` : row?.label;
              },
              label: (ctx) => ` ${formatInr(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: c.text, font: { size: 11 } },
          },
          y: {
            grid: { color: c.grid },
            ticks: {
              color: c.text,
              font: { size: 11 },
              callback: (v) => formatInr(v),
            },
          },
        },
      },
    });
  }

  function renderOccupancy(payload) {
    const c = palette();
    const canvas = document.getElementById('occupancyChart');
    const rows = payload?.data || [];
    const total = rows.reduce((sum, d) => sum + Number(d.value || 0), 0);

    if (!canvas || !rows.length || !total) {
      showState('occupancyChart', 'empty');
      return;
    }

    showState('occupancyChart', 'ready');
    if (occupancyChart) occupancyChart.destroy();

    occupancyChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: rows.map((d) => d.name),
        datasets: [{
          data: rows.map((d) => d.value),
          backgroundColor: c.donut.slice(0, rows.length),
          borderWidth: 0,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: c.text,
              font: { size: 11 },
              boxWidth: 10,
              padding: 12,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const pct = total ? Math.round((ctx.parsed / total) * 100) : 0;
                return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  async function loadCharts() {
    showState('revenueChart', 'loading');
    showState('occupancyChart', 'loading');
    try {
      const [revenueRes, occupancyRes] = await Promise.all([
        axios.get('/api/dashboard/charts/revenue-daily'),
        axios.get('/api/dashboard/charts/occupancy-status'),
      ]);
      if (!revenueRes.data?.ok) throw new Error(revenueRes.data?.error || 'Revenue chart failed');
      renderRevenue(revenueRes.data);
      if (occupancyRes.data?.ok) renderOccupancy(occupancyRes.data);
      else showState('occupancyChart', 'empty');
    } catch (err) {
      console.error(err);
      showState('revenueChart', 'empty');
      showState('occupancyChart', 'empty');
    }
  }

  document.addEventListener('DOMContentLoaded', loadCharts);
  document.getElementById('themeToggle')?.addEventListener('click', () => {
    setTimeout(loadCharts, 120);
  });
})();
